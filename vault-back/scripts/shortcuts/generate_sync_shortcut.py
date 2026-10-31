"""Generate the unsigned VaultedMind Apple Shortcuts (binary plist).

Run:   python3 -I generate_sync_shortcut.py [output_directory]
Sign:  shortcuts sign --mode anyone --input <unsigned> --output <signed>
See README.md. Every encoding used here comes from the real public shortcuts kept in
reference/ or from the Cherri action definitions (github.com/electrikmilk/cherri).
"""
import os
import plistlib
import sys
import uuid

PFX = "is.workflow.actions."
OBJ = "￼"  # placeholder character for an inline variable inside a text

API_BASE = "https://api-vault-mind.cyrus-ag.com"
BATCH_URL = API_BASE + "/integrations/health/batch"

# (backend metric, Health type label, aggregate, group by day).
# Type labels are the ones found in real shortcuts (reference/0baed2...json), except where noted.
# Sums use GroupBy Day so Health de-duplicates iPhone and Watch sources; the averaged
# types are read raw (one Watch source) and averaged.
QUANTITIES = [
    ("STEPS", "Steps", "Sum", True),
    ("ACTIVE_CALORIES", "Active Calories", "Sum", True),
    ("EXERCISE_MINUTES", "Exercise Time", "Sum", True),
    ("RESTING_HEART_RATE", "Resting Heart Rate", "Average", False),
    ("HEART_RATE_VARIABILITY", "Heart Rate Variability", "Average", False),
    ("RESPIRATORY_RATE", "Respiratory Rate", "Average", False),
]
# Not generated because no real shortcut confirms their Health type label:
#   DAYLIGHT_MINUTES (Time in Daylight), MINDFULNESS_MINUTES (Mindful Minutes is a category type)

SLEEP_TYPE_LABEL = "Sleep"
SLEEP_LOOKBACK_DAYS = "2"


def new_uuid():
    return str(uuid.uuid4()).upper()


# ---- value helpers --------------------------------------------------------------------

def attachment(ref):
    return {"Value": ref, "WFSerializationType": "WFTextTokenAttachment"}


def output_ref(uid, name):
    return {"OutputUUID": uid, "OutputName": name, "Type": "ActionOutput"}


def variable_ref(name):
    return {"VariableName": name, "Type": "Variable"}


INPUT_REF = {"Type": "ExtensionInput"}


def token_string(parts):
    """Text made of plain strings and refs (dicts), e.g. ["a|", ref, "|b"]."""
    text = ""
    ranges = {}
    for part in parts:
        if isinstance(part, str):
            text += part
        else:
            ranges["{%d, 1}" % len(text)] = part
            text += OBJ
    return {
        "Value": {"string": text, "attachmentsByRange": ranges},
        "WFSerializationType": "WFTextTokenString",
    }


def action(ident, params):
    return {"WFWorkflowActionIdentifier": PFX + ident, "WFWorkflowActionParameters": params}


# ---- dictionary encoding (Cherri: makeDictionaryItem) ---------------------------------

ITEM_TEXT, ITEM_DICT, ITEM_ARRAY, ITEM_NUMBER = 0, 1, 2, 3


def dict_item(key, item_type, value):
    item = {"WFItemType": item_type, "WFValue": value}
    if key is not None:
        item["WFKey"] = token_string([key])
    return item


def text_item(key, parts):
    return dict_item(key, ITEM_TEXT, token_string(parts))


def number_item(key, parts):
    return dict_item(key, ITEM_NUMBER, token_string(parts))


def dict_value(items):
    """Top level dictionary parameter (one layer)."""
    return {
        "Value": {"WFDictionaryFieldValueItems": items},
        "WFSerializationType": "WFDictionaryFieldValue",
    }


def nested_dict_item(key, items):
    """A dictionary as the value of an item: Shortcuts wraps it in two layers."""
    return dict_item(key, ITEM_DICT, {
        "WFSerializationType": "WFDictionaryFieldValue",
        "Value": {
            "WFSerializationType": "WFDictionaryFieldValue",
            "Value": {"WFDictionaryFieldValueItems": items},
        },
    })


def array_item(key, elements):
    return dict_item(key, ITEM_ARRAY, {"WFSerializationType": "WFArrayParameterState", "Value": elements})


# ---- health filter encodings (reference/0baed2...json) --------------------------------

def today_filter(type_label):
    today = {"Property": "Start Date", "Operator": 1002, "Bounded": True, "Removable": False,
             "Values": {"Number": "1", "Unit": 16}}
    return _health_filter(type_label, today)


def last_days_filter(type_label, days):
    window = {"Property": "Start Date", "Operator": 1001, "Bounded": True, "Removable": False,
              "Values": {"Number": days, "Unit": 16}}
    return _health_filter(type_label, window)


def _health_filter(type_label, date_template):
    return {
        "Value": {
            "WFActionParameterFilterPrefix": 1,
            "WFContentPredicateBoundedDate": False,
            "WFActionParameterFilterTemplates": [
                {
                    "Property": "Type",
                    "Operator": 4,
                    "Bounded": True,
                    "Removable": False,
                    "Values": {"Enumeration": {"Value": type_label,
                                               "WFSerializationType": "WFStringSubstitutableState"}},
                },
                date_template,
            ],
        },
        "WFSerializationType": "WFContentPredicateTableTemplate",
    }


# ---- builder --------------------------------------------------------------------------

class Builder:
    def __init__(self):
        self.actions = []

    def add(self, ident, params):
        self.actions.append(action(ident, params))

    def alert_and_stop_if_empty(self, subject_ref, title, message):
        group = new_uuid()
        self.add("conditional", {
            "GroupingIdentifier": group, "WFControlFlowMode": 0,
            "WFInput": {"Type": "Variable", "Variable": attachment(subject_ref)},
            "WFCondition": 101,
        })
        # The message may embed variables (e.g. the server response) as a token string
        if isinstance(message, list):
            message = token_string(message)
        self.add("alert", {"WFAlertActionTitle": title, "WFAlertActionMessage": message,
                           "WFAlertActionCancelButtonShown": False})
        self.add("exit", {})
        self.add("conditional", {"GroupingIdentifier": group, "WFControlFlowMode": 2, "UUID": new_uuid()})

    def aggregated_quantity(self, label, aggregate, group_by_day):
        """Returns the output ref of the aggregate."""
        samples, result = new_uuid(), new_uuid()
        params = {"UUID": samples, "WFHKSampleFilteringFillMissing": False,
                  "WFContentItemFilter": today_filter(label)}
        if group_by_day:
            params["WFHKSampleFilteringGroupBy"] = "Day"
        self.add("filter.health.quantity", params)
        self.add("statistics", {"UUID": result, "WFStatisticsOperation": aggregate,
                                "Input": attachment(output_ref(samples, "Health Samples"))})
        return output_ref(result, "Statistics")

    def sleep_lines(self):
        """Repeat over the sleep samples; returns the ref of the newline-joined lines."""
        samples = new_uuid()
        self.add("filter.health.quantity", {
            "UUID": samples, "WFHKSampleFilteringFillMissing": False,
            "WFContentItemFilter": last_days_filter(SLEEP_TYPE_LABEL, SLEEP_LOOKBACK_DAYS),
        })
        group = new_uuid()
        self.add("repeat.each", {"GroupingIdentifier": group, "WFControlFlowMode": 0,
                                 "WFInput": attachment(output_ref(samples, "Health Samples"))})
        item = attachment(variable_ref("Repeat Item"))
        value, start, end = new_uuid(), new_uuid(), new_uuid()
        for uid, prop in ((value, "Value"), (start, "Start Date"), (end, "End Date")):
            self.add("properties.health.quantity", {"UUID": uid, "WFInput": item,
                                                    "WFContentItemPropertyName": prop})
        start_iso, end_iso, line = new_uuid(), new_uuid(), new_uuid()
        for uid, source, name in ((start_iso, start, "Start Date"), (end_iso, end, "End Date")):
            self.add("format.date", {
                "UUID": uid, "WFDate": token_string([output_ref(source, name)]),
                "WFDateFormatStyle": "ISO 8601", "WFISO8601IncludeTime": True,
                "WFTimeFormatStyle": "None",
            })
        self.add("gettext", {"UUID": line, "WFTextActionText": token_string([
            output_ref(value, "Value"), "|",
            output_ref(start_iso, "Formatted Date"), "|",
            output_ref(end_iso, "Formatted Date"),
        ])})
        results = new_uuid()
        self.add("repeat.each", {"GroupingIdentifier": group, "WFControlFlowMode": 2, "UUID": results})
        return output_ref(results, "Repeat Results")

    def today(self):
        today = new_uuid()
        # Same shape as the real shortcuts: Format Date over a text holding the Current Date token
        self.add("format.date", {
            "UUID": today, "WFDate": token_string([{"Type": "CurrentDate"}]),
            "WFDateFormatStyle": "Custom", "WFDateFormat": "yyyy-MM-dd", "WFTimeFormatStyle": "None",
        })
        return output_ref(today, "Formatted Date")


def body_items(date_ref, quantity_refs, sleep_ref):
    """Items of the JSON body: date, quantities [{metric, value}], sleepLines (text)."""
    elements = []
    for metric, ref in quantity_refs:
        elements.append(nested_dict_item(None, [
            text_item("metric", [metric]),
            number_item("value", [ref]),
        ]))
    return [
        text_item("date", [date_ref]),
        array_item("quantities", elements),
        text_item("sleepLines", [sleep_ref]),
    ]


def collect_readings(builder):
    refs = []
    for metric, label, aggregate, group_by_day in QUANTITIES:
        refs.append((metric, builder.aggregated_quantity(label, aggregate, group_by_day)))
    sleep_ref = builder.sleep_lines()
    date_ref = builder.today()
    return date_ref, refs, sleep_ref


def build_sync():
    builder = Builder()
    builder.alert_and_stop_if_empty(
        INPUT_REF, "VaultedMind",
        "Ouvrez VaultedMind et touchez « Récupérer mes données Santé » pour lancer ce raccourci.")
    token = new_uuid()
    builder.add("gettext", {"UUID": token, "WFTextActionText": token_string([INPUT_REF])})
    token_ref = output_ref(token, "Text")

    date_ref, refs, sleep_ref = collect_readings(builder)

    response, stored = new_uuid(), new_uuid()
    builder.add("downloadurl", {
        "UUID": response,
        "WFURL": BATCH_URL,
        "WFHTTPMethod": "POST",
        "WFHTTPBodyType": "JSON",
        "ShowHeaders": True,
        "WFHTTPHeaders": dict_value([text_item("X-Sync-Token", [token_ref])]),
        "WFJSONValues": dict_value(body_items(date_ref, refs, sleep_ref)),
    })
    builder.add("getvalueforkey", {
        "UUID": stored, "WFDictionaryKey": "success",
        "WFInput": attachment(output_ref(response, "Contents of URL")),
    })
    builder.alert_and_stop_if_empty(
        output_ref(stored, "Dictionary Value"), "VaultedMind",
        ["La synchronisation a échoué. Retournez dans VaultedMind et réessayez (le lien expire après 5 minutes).\n\nRéponse du serveur : ",
         output_ref(response, "Contents of URL")])
    # No Open URL: Safari or Chrome would open instead of the installed app. The app refreshes
    # itself when it becomes visible again, through the pending marker it saved before leaving.
    builder.add("alert", {
        "WFAlertActionTitle": "VaultedMind",
        "WFAlertActionMessage": "Données envoyées. Revenez dans VaultedMind avec le bouton en haut à gauche.",
        "WFAlertActionCancelButtonShown": False,
    })
    return builder.actions


def build_debug():
    builder = Builder()
    date_ref, refs, sleep_ref = collect_readings(builder)
    body = new_uuid()
    builder.add("dictionary", {"UUID": body, "WFItems": dict_value(body_items(date_ref, refs, sleep_ref))})
    builder.add("showresult", {"Text": token_string([output_ref(body, "Dictionary")])})
    return builder.actions


def write(actions, path):
    workflow = {
        "WFWorkflowActions": actions,
        "WFWorkflowClientVersion": "4033.0.4.3",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowIcon": {"WFWorkflowIconStartColor": 4282601983, "WFWorkflowIconGlyphNumber": 59771},
        "WFWorkflowImportQuestions": [],
        "WFWorkflowInputContentItemClasses": [],
        "WFWorkflowTypes": [],
        "WFWorkflowHasShortcutInputVariables": True,
    }
    with open(path, "wb") as handle:
        plistlib.dump(workflow, handle, fmt=plistlib.FMT_BINARY)
    print("wrote", path)


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    os.makedirs(out_dir, exist_ok=True)
    write(build_sync(), os.path.join(out_dir, "VaultedMind Sync.unsigned.shortcut"))
    write(build_debug(), os.path.join(out_dir, "VaultedMind Sync Debug.unsigned.shortcut"))


if __name__ == "__main__":
    main()

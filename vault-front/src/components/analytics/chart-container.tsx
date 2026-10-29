"use client";

import React, { useEffect } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { ResponsiveContainer } from "recharts";

export interface ChartContainerProps {
  children: React.ReactNode;
  aspect: number;
  mobileAspect?: number;
  minHeight: number;
  fullHeight?: boolean;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  aspect,
  mobileAspect,
  minHeight,
  fullHeight,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (!ref.current) return;
    const target = ref.current;
    const ro = new ResizeObserver((entries) => {
      if (entries[0]) setWidth(entries[0].contentRect.width);
    });
    ro.observe(target);
    return () => ro.unobserve(target);
  }, []);

  // Sur téléphone, une hauteur fixe lisible plutôt qu'un ratio qui écrase la courbe.
  const MOBILE_CHART_HEIGHT = 240;
  const desktopHeight = Math.max(minHeight, Math.round(width / aspect));
  void mobileAspect;

  return (
    <Box
      ref={ref}
      sx={{
        width: "100%",
        minWidth: 0,
        minHeight: isMobile ? MOBILE_CHART_HEIGHT : minHeight,
        flexGrow: fullHeight && !isMobile ? 1 : 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {width > 0 && (
        <ResponsiveContainer
          width={width}
          height={isMobile ? MOBILE_CHART_HEIGHT : fullHeight ? "100%" : desktopHeight}
          minHeight={isMobile ? MOBILE_CHART_HEIGHT : minHeight}
          debounce={50}
        >
          {children as React.ReactElement}
        </ResponsiveContainer>
      )}
    </Box>
  );
};


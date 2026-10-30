export const PERMUTATION_BLOCK_DAYS = 7;

/**
 * Fills `target` with a permutation of 0..length-1 that keeps contiguous blocks intact.
 * Full blocks are shuffled between themselves; the partial head and tail stay in place.
 * The random offset moves block boundaries from one permutation to the next.
 */
export function blockPermutation(
  length: number,
  blockSize: number,
  random: () => number,
  target: Int32Array,
): void {
  for (let index = 0; index < length; index++) target[index] = index;
  const offset = Math.floor(random() * blockSize);
  const blockCount = Math.floor((length - offset) / blockSize);
  if (blockCount < 2) return;

  const order = new Int32Array(blockCount);
  for (let block = 0; block < blockCount; block++) order[block] = block;
  for (let block = blockCount - 1; block > 0; block--) {
    const swapWith = Math.floor(random() * (block + 1));
    const kept = order[block];
    order[block] = order[swapWith];
    order[swapWith] = kept;
  }
  for (let block = 0; block < blockCount; block++) {
    const destination = offset + block * blockSize;
    const source = offset + order[block] * blockSize;
    for (let step = 0; step < blockSize; step++) {
      target[destination + step] = source + step;
    }
  }
}

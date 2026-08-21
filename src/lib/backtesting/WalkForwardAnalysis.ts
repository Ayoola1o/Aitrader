import { Candle } from '@/types/trading';

export interface DataPartition<T> {
  inSample: T[]; // Training (60%)
  validation: T[]; // Validation (20%)
  outOfSample: T[]; // Out-of-sample Testing (20%)
}

export class WalkForwardAnalysis {
  /**
   * Partitions historical data array into train, validation, and out-of-sample slices.
   */
  static partitionData<T>(data: T[], trainRatio = 0.6, valRatio = 0.2): DataPartition<T> {
    const total = data.length;
    const trainEnd = Math.floor(total * trainRatio);
    const valEnd = Math.floor(total * (trainRatio + valRatio));

    return {
      inSample: data.slice(0, trainEnd),
      validation: data.slice(trainEnd, valEnd),
      outOfSample: data.slice(valEnd),
    };
  }

  /**
   * Generates sliding walk-forward optimization windows.
   */
  static generateRollingWindows<T>(
    data: T[],
    windowSize: number,
    stepSize: number
  ): { train: T[]; test: T[] }[] {
    const windows: { train: T[]; test: T[] }[] = [];
    const trainSize = Math.floor(windowSize * 0.7);
    const testSize = windowSize - trainSize;

    for (let i = 0; i + windowSize <= data.length; i += stepSize) {
      const train = data.slice(i, i + trainSize);
      const test = data.slice(i + trainSize, i + windowSize);
      windows.push({ train, test });
    }

    return windows;
  }
}

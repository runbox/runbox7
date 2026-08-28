// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
//
// This file is part of Runbox 7.
//
// Runbox 7 is free software: You can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// Runbox 7 is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { DownloadableSearchIndexMap } from
  '@runboxcom/runbox-searchindex/downloadablesearchindexmap.class';

import {
  NormalizedIndexManifest,
  NormalizedIndexPartition,
  NormalizedIndexPartitionFile
} from './index-sync.types';

const MAIN_PARTITION_FOLDER = 'downloadable';
const HISTORICAL_PARTITION_FOLDER = /^xapianglass_(\d+)$/;

export class IndexManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IndexManifestError';
  }
}

const requireNonNegativeNumber = (value: number, description: string): number => {
  if (!Number.isFinite(value) || value < 0) {
    throw new IndexManifestError(`Invalid ${description} metadata`);
  }
  return value;
};

const partitionNumber = (folder: string): number => {
  if (folder === MAIN_PARTITION_FOLDER) {
    return 0;
  }

  const match = HISTORICAL_PARTITION_FOLDER.exec(folder);
  if (!match) {
    throw new IndexManifestError(`Unrecognized index partition folder: ${folder}`);
  }
  return parseInt(match[1], 10);
};

const normalizeFiles = (
  files: DownloadableSearchIndexMap['partitions'][number]['files'],
  folder: string
): NormalizedIndexPartitionFile[] => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new IndexManifestError(`Missing file metadata for ${folder}`);
  }

  return files.map(file => {
    if (!file || typeof file.filename !== 'string' ||
      !/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(file.filename)) {
      throw new IndexManifestError(`Invalid filename metadata for ${folder}`);
    }
    return {
      filename: file.filename,
      compressedsize: requireNonNegativeNumber(file.compressedsize, 'compressed size'),
      uncompressedsize: requireNonNegativeNumber(file.uncompressedsize, 'uncompressed size')
    };
  });
};

export const normalizeIndexManifest = (
  manifest: DownloadableSearchIndexMap
): NormalizedIndexManifest => {
  if (!manifest || !Array.isArray(manifest.partitions)) {
    throw new IndexManifestError('Missing index partition metadata');
  }

  const seenPartitionNumbers = new Set<number>();
  const partitions: NormalizedIndexPartition[] = manifest.partitions.map(partition => {
    if (!partition || typeof partition.folder !== 'string') {
      throw new IndexManifestError('Invalid index partition metadata');
    }

    const number = partitionNumber(partition.folder);
    if (seenPartitionNumbers.has(number)) {
      throw new IndexManifestError(`Duplicate index partition number: ${number}`);
    }
    seenPartitionNumbers.add(number);

    return {
      number,
      folder: partition.folder,
      numberOfMessages: requireNonNegativeNumber(
        partition.numberOfMessages,
        'message count'
      ),
      files: normalizeFiles(partition.files, partition.folder)
    };
  });

  if (!seenPartitionNumbers.has(0)) {
    throw new IndexManifestError('Index manifest is missing partition 0');
  }

  partitions.sort((left, right) => left.number - right.number);

  return {
    partitions,
    totalCompressedBytes: partitions.reduce((total, partition) => total +
      partition.files.reduce((partitionTotal, file) =>
        partitionTotal + file.compressedsize, 0), 0),
    totalUncompressedBytes: partitions.reduce((total, partition) => total +
      partition.files.reduce((partitionTotal, file) =>
        partitionTotal + file.uncompressedsize, 0), 0),
    totalMessages: partitions.reduce((total, partition) =>
      total + partition.numberOfMessages, 0)
  };
};

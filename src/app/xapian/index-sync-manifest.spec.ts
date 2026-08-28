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

import { IndexManifestError, normalizeIndexManifest } from './index-sync-manifest';

const partition = (
  folder: string,
  numberOfMessages = 1,
  compressedsize = 10,
  uncompressedsize = 100
) => ({
  folder,
  numberOfMessages,
  files: [{
    filename: 'iamglass',
    compressedsize,
    uncompressedsize
  }]
});

const manifest = (
  ...partitions: ReturnType<typeof partition>[]
): DownloadableSearchIndexMap => ({ partitions });

describe('normalizeIndexManifest', () => {
  it('keeps the main partition first and sorts historical partitions numerically', () => {
    const result = normalizeIndexManifest(manifest(
      partition('downloadable'),
      partition('xapianglass_10'),
      partition('xapianglass_2'),
      partition('xapianglass_1')
    ));

    expect(result.partitions.map(indexPartition => indexPartition.number))
      .toEqual([0, 1, 2, 10]);
  });

  it('totals compressed bytes, uncompressed bytes, and messages', () => {
    const result = normalizeIndexManifest(manifest(
      partition('downloadable', 1, 10, 100),
      partition('xapianglass_1', 2, 20, 200),
      partition('xapianglass_2', 3, 30, 300)
    ));

    expect(result.totalCompressedBytes).toBe(60);
    expect(result.totalUncompressedBytes).toBe(600);
    expect(result.totalMessages).toBe(6);
  });

  it('rejects a missing main partition', () => {
    expect(() => normalizeIndexManifest(manifest(partition('xapianglass_1'))))
      .toThrowError(IndexManifestError, /partition 0/i);
  });

  it('rejects duplicate partition numbers', () => {
    expect(() => normalizeIndexManifest(manifest(
      partition('downloadable'),
      partition('xapianglass_1'),
      partition('xapianglass_01')
    ))).toThrowError(IndexManifestError, /duplicate/i);
  });

  it('rejects unknown folder names and incomplete file metadata', () => {
    expect(() => normalizeIndexManifest(manifest(
      partition('downloadable'),
      partition('archive')
    ))).toThrowError(IndexManifestError, /archive/);

    const missingSize = {
      partitions: [{
        folder: 'downloadable',
        numberOfMessages: 1,
        files: [{ filename: 'iamglass', uncompressedsize: 100 }]
      }]
    } as unknown as DownloadableSearchIndexMap;
    expect(() => normalizeIndexManifest(missingSize))
      .toThrowError(IndexManifestError, /metadata/i);
  });

  it('rejects filenames that can escape their partition directory', () => {
    const unsafe = partition('downloadable');
    unsafe.files[0].filename = '../iamglass';

    expect(() => normalizeIndexManifest(manifest(unsafe)))
      .toThrowError(IndexManifestError, /filename/i);
  });
});

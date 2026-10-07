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

import { prepareInitialIndexOpen, runInitialIndexOpen } from './initial-index-open';

describe('prepareInitialIndexOpen', () => {
  it('reloads an already initialized worker before acknowledging readiness', async () => {
    const timeline: string[] = [];

    await prepareInitialIndexOpen({
      alreadyInitialized: true,
      initialize: async () => {
        timeline.push('initialize');
      },
      reload: async () => {
        timeline.push('reload');
      }
    });

    expect(timeline).toEqual(['reload']);
  });

  it('initializes a new worker normally', async () => {
    const timeline: string[] = [];

    await prepareInitialIndexOpen({
      alreadyInitialized: false,
      initialize: async () => {
        timeline.push('initialize');
      },
      reload: async () => {
        timeline.push('reload');
      }
    });

    expect(timeline).toEqual(['initialize']);
  });

  it('reports a missing stored index exactly once without initializing', async () => {
    const terminalEvents: string[] = [];
    let initializeCalls = 0;

    await runInitialIndexOpen({
      lookupStoredIndex: async () => false,
      initialize: async () => {
        initializeCalls++;
        return 1234;
      },
      ready: () => terminalEvents.push('ready'),
      failed: () => terminalEvents.push('failed')
    });

    expect(initializeCalls).toBe(0);
    expect(terminalEvents).toEqual(['failed']);
  });

  [
    'indexed database open failed',
    'file lookup failed',
    'IDBFS population failed',
    'Xapian open failed'
  ].forEach((message, index) => {
    it(`reports ${message} exactly once`, async () => {
      const terminalEvents: string[] = [];

      await runInitialIndexOpen({
        lookupStoredIndex: async () => {
          if (index < 2) {
            throw new Error(message);
          }
          return true;
        },
        initialize: async () => {
          throw new Error(message);
        },
        ready: () => terminalEvents.push('ready'),
        failed: error => terminalEvents.push(`failed: ${error.message}`)
      });

      expect(terminalEvents).toEqual([`failed: ${message}`]);
    });
  });

  it('reports readiness only after initialization returns the baseline', async () => {
    const terminalEvents: string[] = [];

    await runInitialIndexOpen({
      lookupStoredIndex: async () => true,
      initialize: async () => 1234,
      ready: baseline => terminalEvents.push(`ready: ${baseline}`),
      failed: () => terminalEvents.push('failed')
    });

    expect(terminalEvents).toEqual(['ready: 1234']);
  });
});

import { describe, expect, it } from 'vitest';
import { compareVersions } from './appUpdater';

describe('app update versions', () => {
  it('recognizes newer semantic versions', () => expect(compareVersions('0.9.0', '0.8.0')).toBe(1));
  it('ignores a v prefix and missing patch segments', () => expect(compareVersions('v1.2', '1.2.0')).toBe(0));
  it('does not offer an older release', () => expect(compareVersions('0.8.9', '0.9.0')).toBe(-1));
});

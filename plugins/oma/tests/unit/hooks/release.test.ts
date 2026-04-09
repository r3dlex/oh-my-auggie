import { describe, it, expect } from 'vitest';

function bumpVersion(current: string, arg: string): string {
  const m = current.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!m) throw new Error(`Invalid version: "${current}"`);
  let major = +m[1], minor = +m[2], patch = +m[3];
  const pre = m[4] ?? '';
  const preStr = pre ? `-${pre}` : '';
  switch (arg) {
    case 'patch': patch++; break;
    case 'minor': minor++; patch = 0; break;
    case 'major': major++; minor = 0; patch = 0; break;
    default: {
      if (/^\d+\.\d+\.\d+$/.test(arg)) return arg + preStr;
      throw new Error(`Invalid argument "${arg}". Use patch, minor, major, or X.Y.Z`);
    }
  }
  return `${major}.${minor}.${patch}${preStr}`;
}

describe('bumpVersion', () => {
  it('patches normal version', () => {
    expect(bumpVersion('0.1.2', 'patch')).toBe('0.1.3');
  });
  it('keeps pre-release on patch', () => {
    expect(bumpVersion('0.1.2-alpha.1', 'patch')).toBe('0.1.3-alpha.1');
  });
  it('keeps pre-release on minor', () => {
    expect(bumpVersion('0.1.2-alpha.1', 'minor')).toBe('0.2.0-alpha.1');
  });
  it('keeps pre-release on major', () => {
    expect(bumpVersion('0.1.2-alpha.1', 'major')).toBe('1.0.0-alpha.1');
  });
  it('accepts explicit version and keeps pre-release suffix', () => {
    expect(bumpVersion('0.1.2-alpha.1', '1.0.0')).toBe('1.0.0-alpha.1');
  });
  it('accepts explicit version with no pre-release', () => {
    expect(bumpVersion('0.1.2', '1.0.0')).toBe('1.0.0');
  });
  it('errors on invalid bump type', () => {
    expect(() => bumpVersion('0.1.2', 'foobar')).toThrow();
  });
  it('errors on malformed version', () => {
    expect(() => bumpVersion('not-a-version', 'patch')).toThrow();
  });
});

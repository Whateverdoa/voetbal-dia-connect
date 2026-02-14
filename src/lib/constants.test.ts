import { describe, it, expect, beforeEach } from 'vitest';
import { setAdminPin, getAdminPin, clearAdminSession, isAdminAuthenticated } from './adminSession';

describe('adminSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns empty string when no PIN is stored', () => {
    expect(getAdminPin()).toBe('');
  });

  it('isAdminAuthenticated returns false when no PIN stored', () => {
    expect(isAdminAuthenticated()).toBe(false);
  });

  it('stores and retrieves admin PIN', () => {
    setAdminPin('1234');
    expect(getAdminPin()).toBe('1234');
    expect(isAdminAuthenticated()).toBe(true);
  });

  it('clearAdminSession removes the PIN', () => {
    setAdminPin('5678');
    expect(isAdminAuthenticated()).toBe(true);
    clearAdminSession();
    expect(getAdminPin()).toBe('');
    expect(isAdminAuthenticated()).toBe(false);
  });

  it('preserves PIN as string including leading zeros', () => {
    setAdminPin('0042');
    expect(getAdminPin()).toBe('0042');
  });
});

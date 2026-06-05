import { describe, expect, it } from 'vitest';
import {
  appendQuery,
  buildCategoryHref,
  categoryFiltersToSearchParams,
  parseCategoryFilters,
  type CategoryFilters,
} from './category-search-params';

const DEFAULTS: CategoryFilters = {
  query: '',
  rarities: [],
  setSlugs: [],
  sort: 'best',
  page: 1,
  view: 'grid',
};

describe('parseCategoryFilters', () => {
  it('falls back to defaults for empty params', () => {
    expect(parseCategoryFilters({})).toEqual(DEFAULTS);
  });

  it('parses every supported param', () => {
    expect(
      parseCategoryFilters({
        q: '  리자몽 ',
        rarity: 'SAR, AR',
        set: 'pokemon-kr-151',
        sort: 'name-asc',
        page: '3',
        view: 'list',
      }),
    ).toEqual({
      query: '리자몽',
      rarities: ['SAR', 'AR'],
      setSlugs: ['pokemon-kr-151'],
      sort: 'name-asc',
      page: 3,
      view: 'list',
    });
  });

  it('takes the first entry for repeated scalar params and ignores invalid values', () => {
    expect(parseCategoryFilters({ sort: ['bogus', 'name-desc'], page: '0', view: 'masonry' })).toEqual({
      ...DEFAULTS,
      sort: 'best',
      page: 1,
      view: 'grid',
    });
  });
});

describe('categoryFiltersToSearchParams', () => {
  it('omits default values', () => {
    expect(categoryFiltersToSearchParams(DEFAULTS).toString()).toBe('');
  });

  it('serializes non-default values with comma lists', () => {
    expect(
      categoryFiltersToSearchParams({
        query: '리자몽',
        rarities: ['SAR'],
        setSlugs: ['pokemon-kr-151', 'pokemon-kr-terastal-festa-ex'],
        sort: 'name-asc',
        page: 2,
        view: 'list',
      }).toString(),
    ).toBe(
      'q=%EB%A6%AC%EC%9E%90%EB%AA%BD&rarity=SAR&set=pokemon-kr-151%2Cpokemon-kr-terastal-festa-ex&sort=name-asc&view=list&page=2',
    );
  });

  it('round-trips through parse', () => {
    const filters: CategoryFilters = {
      query: '리자몽',
      rarities: ['SAR', 'AR'],
      setSlugs: ['pokemon-kr-151'],
      sort: 'name-desc',
      page: 5,
      view: 'list',
    };
    const params = categoryFiltersToSearchParams(filters);
    expect(parseCategoryFilters(Object.fromEntries(params))).toEqual(filters);
  });
});

describe('buildCategoryHref', () => {
  it('returns the bare base path when no params are set', () => {
    expect(buildCategoryHref('/categories/pokemon', DEFAULTS)).toBe('/categories/pokemon');
  });

  it('appends a query string when params are present', () => {
    expect(buildCategoryHref('/categories/pokemon', { ...DEFAULTS, page: 2 })).toBe(
      '/categories/pokemon?page=2',
    );
  });
});

describe('appendQuery', () => {
  it('returns the bare path for empty params', () => {
    expect(appendQuery('/categories/pokemon', new URLSearchParams())).toBe('/categories/pokemon');
  });

  it('appends an existing params object', () => {
    expect(appendQuery('/categories/pokemon', new URLSearchParams('rarity=SAR'))).toBe(
      '/categories/pokemon?rarity=SAR',
    );
  });
});

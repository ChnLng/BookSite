import { describe, expect, it } from 'vitest';
import { defaultCatalogue, validateCatalogue } from '../src/lib/android-catalogue';
import { parsePlayCodesCsv, playCodeError } from '../src/lib/play-code-inventory';

describe('catalogue editor trust boundary', () => {
  it('accepts both editions and keeps mutable drafts independent', () => {
    const consumer=defaultCatalogue('android'), business=defaultCatalogue('android-professionnels');
    expect(validateCatalogue(consumer)).toEqual(consumer);
    expect(validateCatalogue(business)).toEqual(business);
    consumer.apps[0].title='Modified';
    expect(business.apps[0].title).not.toBe('Modified');
  });
  it('rejects price manipulation, unknown app destinations and invalid discount tiers', () => {
    const config=defaultCatalogue('android-professionnels');
    expect(()=>validateCatalogue({...config,packages:[{...config.packages[0],price:-1}]})).toThrow();
    expect(()=>validateCatalogue({...config,tiers:[{minimum:12,percent:80}]})).toThrow();
    expect(()=>validateCatalogue({...config,tiers:[{minimum:1,percent:80},{minimum:12,percent:90}]})).toThrow();
    expect(()=>validateCatalogue({...config,apps:[{...config.apps[0],packageName:'malicious.app'}]})).toThrow();
    expect(()=>validateCatalogue({...config,apps:[config.apps[0],config.apps[0]]})).toThrow();
    expect(()=>validateCatalogue({...config,apps:config.apps.map(app=>({...app,visible:false}))})).toThrow();
  });
});

describe('Google Play CSV import', () => {
  it('accepts Google export header, BOM, CRLF and quoted rows without allocating duplicates', () => {
    expect(parsePlayCodesCsv('\uFEFFPromotion code\r\n"SYNTHETIC0001"\r\nsynthetic0001\r\nSYNTHETIC0002')).toEqual(['SYNTHETIC0001','SYNTHETIC0002']);
  });
  it('rejects multi-column exports, URLs, formulas and empty inventories', () => {
    for (const csv of ['code,date\nSYNTHETIC0001,2026-08-30','https://example.test','=SUM(A1)','Promotion code\n']) expect(()=>parsePlayCodesCsv(csv)).toThrow();
  });
  it('does not leak raw database errors or code values to the client', () => {
    const result=playCodeError({code:'23505',message:'duplicate code SECRET0001 for person@example.test'});
    expect(result.message).not.toContain('SECRET');
    expect(result.message).not.toContain('person@');
  });
});

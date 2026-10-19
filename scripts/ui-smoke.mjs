// Smoke test de UI: abre cada página com o Supabase simulado e falha se houver erro de console.
// Uso: PLAYWRIGHT_MODULE=<caminho/playwright-core/index.mjs> TORRE_TEST_URL=http://127.0.0.1:5173/ node scripts/ui-smoke.mjs
import {pathToFileURL} from 'node:url';

const baseUrl = process.env.TORRE_TEST_URL ?? 'http://127.0.0.1:5173/';
const playwrightModule = process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  : 'playwright';
const {chromium} = await import(playwrightModule);

const userId = 'a7ba7610-735e-4da5-a17f-104419acf001';
const user = {
  id: userId,
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-10-06T00:00:00Z',
};
const pages = ['Home', 'Caixa de entrada', 'Tarefas', 'Planejamento', 'Conversas', 'Modo IA', 'Configurações'];
const viewports = [
  {name: '1440', width: 1440, height: 1000},
  {name: '390', width: 390, height: 844},
];
const themes = ['light', 'dark'];

const tables = {
  torre_preferences: [{user_id: userId, timezone: 'America/Sao_Paulo', theme: 'light'}],
  torre_work_hours: Array.from({length: 7}, (_, weekday) => ({
    weekday,
    user_id: userId,
    enabled: weekday > 0 && weekday < 6,
    start_time: '09:00',
    end_time: '18:00',
  })),
  torre_ai_settings: [{user_id: userId, has_key: true, enabled: true}],
};

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
};

async function mockSupabase(route, theme) {
  const request = route.request();
  const url = new URL(request.url());
  const reply = (body) => route.fulfill({status: 200, headers: corsHeaders, body: JSON.stringify(body)});
  if (request.method() === 'OPTIONS') return reply({});
  if (url.pathname.startsWith('/auth/')) return reply(user);
  if (url.pathname.includes('/functions/')) return reply({ok: true});
  if (url.pathname.includes('/rpc/')) return reply(null);
  const table = url.pathname.split('/').pop();
  const rows = table === 'torre_preferences'
    ? [{...tables.torre_preferences[0], theme}]
    : tables[table] ?? [];
  const wantsObject = request.headers().accept?.includes('object+json');
  return reply(wantsObject ? rows[0] ?? null : rows);
}

const browser = await chromium.launch({channel: 'msedge', headless: true});
const failures = [];

for (const viewport of viewports) {
  for (const theme of themes) {
    for (const page of pages) {
      const context = await browser.newContext({viewport, timezoneId: 'America/Sao_Paulo'});
      await context.route('https://nvxwqrpztecrvrxoddxf.supabase.co/**', (route) => mockSupabase(route, theme));
      await context.addInitScript(({user, userId, page}) => {
        const token = [
          btoa(JSON.stringify({alg: 'HS256', typ: 'JWT'})),
          btoa(JSON.stringify({sub: userId, role: 'authenticated', exp: 4102444800})),
          'test',
        ].join('.');
        const session = {access_token: token, refresh_token: 'test', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user};
        localStorage.setItem('sb-nvxwqrpztecrvrxoddxf-auth-token', JSON.stringify(session));
        localStorage.setItem(`torre:${userId}:page`, JSON.stringify(page));
      }, {user, userId, page});

      const errors = [];
      const tab = await context.newPage();
      tab.on('pageerror', (error) => errors.push(error.message));
      tab.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await tab.goto(baseUrl);
      await tab.waitForTimeout(800);
      if(viewport.name==='390'&&page!=='Modo IA'){const bar=tab.getByRole('navigation',{name:'Navegação principal'});if(!(await bar.isVisible()))errors.push('barra inferior ausente');await tab.getByRole('button',{name:'Mais opções'}).click();if(!(await tab.getByRole('button',{name:'Configurações',exact:true}).isVisible()))errors.push('Mais não abriu o menu');await tab.keyboard.press('Escape');await tab.getByRole('button',{name:'Captura rápida'}).click();if(!(await tab.getByRole('dialog',{name:'Captura rápida'}).isVisible()))errors.push('botão flutuante não abriu a captura');await tab.keyboard.press('Escape');}
      const hasHorizontalScroll = await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (hasHorizontalScroll) errors.push('rolagem horizontal na página');

      const label = `${page} · ${viewport.name}px · ${theme}`;
      if (errors.length) failures.push(`${label}: ${errors.join(' | ')}`);
      console.log(`${errors.length ? 'FAIL' : 'ok  '} ${label}`);
      await context.close();
    }
  }
}

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} falha(s):\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('\nPASS: nenhuma página com erro de console');

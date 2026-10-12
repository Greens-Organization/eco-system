// Preload dos testes unitários: as vars obrigatórias dos pack-env, setadas
// ANTES de qualquer import do app. Unitários não tocam o banco (as deps são
// injetadas), então o DATABASE_URL aponta para um destino que nunca existe.
// Override INCONDICIONAL: o Bun auto-carrega os .env locais, e o resultado do
// teste não pode depender deles — no CI eles nem existem.
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/unit';
process.env.REDIS_URL = 'redis://127.0.0.1:1';
process.env.BETTER_AUTH_SECRET = 'unit-secret-not-for-prod-0123456789';
process.env.CLIENT_IP_SECRET = 'unit-client-ip-secret-not-for-prod-0123456789';
process.env.BETTER_AUTH_URL = 'http://localhost:3002';
process.env.ORIGIN_ALLOWED = 'http://localhost:3000';
process.env.SMTP_FROM = 'unit@eco.local';

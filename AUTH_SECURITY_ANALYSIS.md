# Análise de Segurança do Fluxo de Autenticação (Better Auth)

**Data:** 18 de Fevereiro de 2026
**Status:** Análise Preliminar (Segura com ressalvas)

## Resumo Executivo
O fluxo de autenticação proposto (Better Auth + Interceptador Global + Redirecionamento Client-Side) é **seguro para proteção de dados**, pois a validação real ocorre no backend (API). No entanto, existem riscos de UX (Experiência do Usuário) e vetores potenciais de Open Redirect se não forem tratados corretamente.

---

## Pontos de Atenção e Mitigação

### 1. Loop de Redirecionamento Infinito (Risco UX: Alto)
**Cenário:** O usuário acessa `/sign-in`. Se algum componente global (ex: Header, Sidebar, Avatar) tentar verificar a sessão (`useSession`) e receber 401/404, o interceptador global (`client.ts`) forçará um reload da página `/sign-in`, criando um loop infinito.

**Mitigação (Implementada/Recomendada):**
- O interceptador `onError` deve verificar se a URL atual (`window.location.pathname`) já é `/sign-in` ou `/sign-up` antes de redirecionar.
- **Código Sugerido:**
  ```typescript
  if ((e.error.status === 401 || e.error.status === 404) && 
      !window.location.pathname.includes('/sign-in') && 
      !window.location.pathname.includes('/sign-up')) {
    window.location.href = '/sign-in';
  }
  ```

### 2. Open Redirect (Risco Segurança: Médio)
**Cenário:** O componente `SignIn` aceita uma prop `callbackURL`. Se esta prop for populada dinamicamente via query string (ex: `?callbackURL=http://evil.com`), um atacante pode criar links de phishing que redirecionam a vítima após o login.

**Mitigação (Atual):**
- O Dashboard atualmente passa uma URL fixa/relativa (`/${locale}`).
- **Recomendação Futura:** Se usar redirecionamento dinâmico, validar estritamente se a URL começa com `/` (relativa) ou pertence ao domínio da aplicação.

### 3. Bypass de Autenticação Client-Side (Risco Segurança: Baixo)
**Cenário:** Um usuário malicioso pode bloquear o JavaScript ou manipular o código para impedir o redirecionamento.
**Impacto:** O usuário permanece na página "protegida", mas **não acessa dados sensíveis**.
**Defesa:** O backend (`auth-middleware.ts`) rejeita todas as requisições sem sessão válida com 401. A interface ficará quebrada ou vazia, garantindo a confidencialidade dos dados.

### 4. CSRF e XSS (Risco Segurança: Baixo)
**Defesa:** O `better-auth` implementa tokens CSRF e validação de origem (`trustedOrigins` configurado em `packages/auth/server.ts`). O uso de cookies `httpOnly` e `Secure` (padrão em produção) mitiga o roubo de sessão via XSS.

---

## Ciclo de Vida da Requisição Segura

1.  **Usuário Acessa Rota Protegida:** Requisição inicial ao Frontend.
2.  **Verificação de Sessão (Client):** `authClient` tenta validar sessão.
3.  **Falha de Sessão (401/404):**
    - **Backend:** Rejeita requisição, protege dados.
    - **Frontend (Interceptador):** Detecta erro -> Verifica se já está no login -> Força redirecionamento para `/sign-in`.
4.  **Login:** Usuário insere credenciais -> Backend valida -> Novo Cookie de Sessão é definido.
5.  **Redirecionamento Pós-Login:** Usuário enviado para Dashboard (`callbackURL` segura).

## Conclusão
A implementação é sólida do ponto de vista de segurança da informação (confidencialidade/integridade). O foco principal deve ser na **robustez da UX** para evitar loops de redirecionamento e garantir que mensagens de erro sejam claras.

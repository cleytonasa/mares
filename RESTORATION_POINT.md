# 📍 Ponto de Restauração - Antes da Implementação da IA Náutica
**Data:** 22 de Agosto de 2026

Este documento marca o estado exato da aplicação antes da integração do Assistente de Inteligência Artificial para dúvidas dos visitantes.

---

### 📦 Arquivos adicionados nesta funcionalidade:
1. `src/components/NauticalAIAssistant.tsx` (Componente visual do chat/assistente)
2. `src/services/aiNauticalService.ts` (Motor de raciocínio náutico e integração com IA)
3. `RESTORATION_POINT.md` (Este arquivo de registro)

### 🔄 Como restaurar para o estado anterior (Sem IA):
Se você desejar remover ou ocultar o assistente de IA no futuro, basta:
1. No arquivo `src/App.tsx`, remover a linha de importação:
   ```tsx
   import { NauticalAIAssistant } from './components/NauticalAIAssistant';
   ```
2. E remover o componente `<NauticalAIAssistant ... />` antes do fechamento da tag `</div>` em `src/App.tsx`.
3. Executar `npm run build`.

---
*Versão base com tábuas DHN 2026, ventos em tempo real, curva de 48h, mapa de satélite e embarques de sal preservada com 100% de integridade.*

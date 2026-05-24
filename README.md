- Brazilian Portuguese

# Sistema P2P de Transferência de Arquivos

Implementação de uma rede Peer-to-Peer (P2P) em TypeScript e Node.js para transferência distribuída de arquivos. O sistema fragmenta arquivos em chunks, distribui os blocos entre peers e reconstrói o arquivo original com validação de integridade por SHA-256.

## Tecnologias

- Node.js
- TypeScript
- TCP Sockets
- SHA-256

## Funcionalidades

- Transferência P2P
- Fragmentação e remontagem de arquivos
- Verificação de integridade por hash
- Métricas de upload e download

## Execução

Modo de desenvolvimento (Recomendado)
```bash
npm install
npm run dev
```

Modo de produção
```bash
npm install
npm run build
npm start
```

## Autor

Lucas Henrique Ferreira Sousa

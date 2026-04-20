# Sistema P2P de Transferência de Arquivos(Brazilian Portuguese)

## Descrição

Este projeto consiste na implementação de um sistema de transferência de arquivos no modelo Peer-to-Peer (P2P), desenvolvido em TypeScript utilizando Node.js. Cada nó da rede (peer) atua simultaneamente como cliente e servidor, sendo capaz de solicitar e fornecer partes de arquivos para outros peers conectados.

O sistema realiza a fragmentação de arquivos em blocos (chunks), a transferência distribuída desses blocos entre múltiplos peers e a remontagem do arquivo original ao final do processo. A integridade dos dados é garantida por meio de funções de hash (SHA-256), aplicadas individualmente a cada bloco.

## Objetivos

* Implementar comunicação P2P simétrica
* Permitir transferência distribuída de arquivos
* Fragmentar e remontar arquivos grandes
* Garantir integridade dos dados com verificação por hash
* Gerenciar múltiplas conexões simultâneas

## Tecnologias Utilizadas

* Node.js
* TypeScript
* Módulo nativo `net` (sockets TCP)
* Módulo `crypto` (hash SHA-256)
* Módulo `fs` (manipulação de arquivos)

## Estrutura do Projeto

```
src/
│
├── core/
│   ├── FileChunkManager.ts
│   └── Peer.ts
│
├── network/
│   ├── Server.ts
│   └── Client.ts
│
├── protocol/
│   └── Message.ts
│
├── utils/
│   └── Hash.ts
│
└── index.ts
```

## Funcionalidades

### Fragmentação de Arquivo

* Divisão de arquivos em blocos de tamanho fixo (ex: 1024 bytes)
* Geração de hash SHA-256 para cada bloco

### Transferência P2P

* Peers se conectam diretamente entre si
* Solicitação e envio de blocos sob demanda
* Compartilhamento progressivo (leecher se torna seeder)

### Validação de Dados

* Verificação de integridade por hash de cada bloco
* Possibilidade de descarte de blocos corrompidos

### Remontagem

* Reconstrução do arquivo original após recebimento completo
* Verificação opcional de integridade global

## Como Executar

### Pré-requisitos

* Node.js >= 18
* npm ou yarn

### Instalação

```bash
npm install
```

### Compilação

```bash
npx tsc
```

### Execução

```bash
node dist/index.js
```

## Configuração

Cada peer deve ser configurado com:

* Endereço IP
* Porta de escuta
* Lista de peers vizinhos

Exemplo:

```json
{
  "host": "127.0.0.1",
  "port": 4000,
  "neighbors": [
    { "host": "127.0.0.1", "port": 5000 }
  ]
}
```

## Testes

O sistema pode ser testado com diferentes cenários:

* Quantidade de peers: 2 ou mais
* Tamanho dos blocos: 1KB ou 4KB
* Tamanho do arquivo: pequeno, médio e grande

Para validação:

* Comparar hash do arquivo final com o original
* Verificar logs de transferência
* Confirmar integridade dos blocos recebidos

## Possíveis Extensões

* Implementação de um tracker
* Balanceamento de carga entre peers
* Download paralelo otimizado
* Interface gráfica
* Suporte a múltiplos arquivos simultâneos

## Autor

Lucas Henrique Ferreira Sousa
Projeto desenvolvido como trabalho prático da disciplina de Sistemas Distribuídos.

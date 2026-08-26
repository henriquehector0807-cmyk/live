# PRD - Live Replay Commerce

## 1. Visao Geral

Live Replay Commerce e uma aplicacao web para transformar uma live gravada em uma experiencia de compra interativa. O administrador cadastra produtos, faz upload de um video real, sincroniza produtos com trechos do video e publica uma pagina vertical estilo live commerce. O visitante assiste ao replay, ve o produto ativo no momento correto, envia comentarios reais, inicia uma compra e e redirecionado para um link de pagamento real configurado no produto.

O foco do produto e funcionalidade real com persistencia: sem videos mockados, produtos ficticios, comentarios falsos, curtidas falsas, pedidos simulados ou URLs de pagamento inventadas.

## 2. Objetivos

- Reproduzir lives gravadas automaticamente em modo muted.
- Permitir que produtos reais aparecam conforme o tempo real do video.
- Permitir compra do produto ativo no momento da live.
- Criar pedidos reais com status inicial `pending_payment`.
- Redirecionar o cliente para o link de pagamento real cadastrado no produto.
- Registrar comentarios e interacoes reais.
- Manter a experiencia visual atual de live commerce mobile vertical.

## 3. Nao Objetivos

- Nao recriar a aplicacao inteira.
- Nao implementar gateway de pagamento direto nesta fase.
- Nao marcar pedido como pago apenas por redirecionamento.
- Nao gerar espectadores, comentarios, curtidas ou compras falsas.
- Nao substituir a UI atual por uma landing page.

## 4. Personas

- Administrador/influenciador: cria produtos, cria lives, envia videos, configura timeline de produtos, acompanha pedidos e comentarios.
- Visitante/comprador: assiste ao replay, ve produtos sincronizados, comenta, compra e segue para o pagamento externo.

## 5. Fluxo Principal

1. Administrador faz login.
2. Administrador cadastra um produto real com nome, imagem, preco, estoque e link de pagamento.
3. Administrador cria uma live e envia um video real.
4. Administrador abre a aba Produtos da Live.
5. Administrador assiste ao video no painel e usa `video.currentTime` para marcar inicio e fim de exibicao de cada produto.
6. Visitante abre a pagina publica da live.
7. Video inicia automaticamente muted, ou exibe "Toque para assistir" se o navegador bloquear autoplay.
8. Conforme `video.currentTime`, o produto ativo aparece e desaparece.
9. Visitante clica em Comprar Agora.
10. Sistema abre resumo do produto ativo.
11. Visitante informa quantidade e dados de entrega.
12. Sistema cria pedido real com status `pending_payment`.
13. Sistema redireciona para `paymentUrl` do produto ativo.

## 6. Requisitos Funcionais

### RF1 - Player Publico da Live

- Deve usar `live.videoUrl` salva no banco.
- Deve iniciar automaticamente com `autoplay`, `muted` e `playsInline`.
- Deve tentar executar `video.play()` apos o video estar pronto.
- Se autoplay for bloqueado, deve exibir o botao "Toque para assistir".
- Deve exibir estados reais: carregando, reproduzindo, pausada, finalizada e erro.
- Deve oferecer play, pause, seek, progresso, tempo atual, duracao, volume, mute/som e fullscreen.
- Deve preservar funcionamento apos refresh da pagina.

### RF2 - Upload e Persistencia do Video

- Upload deve salvar arquivo real no storage configurado.
- Em ambiente local, o arquivo deve ser salvo em `uploads/`.
- A URL persistida deve continuar acessivel apos refresh e novo login.
- O player nunca deve depender de `blob:` temporario como URL permanente.

### RF3 - Produtos da Live no Admin

- A aba "Produtos da Live" deve listar produtos reais do administrador.
- Deve exibir o player real da live no painel.
- O administrador deve conseguir marcar inicio e fim usando o tempo atual do video.
- O sistema deve usar obrigatoriamente `video.currentTime`.
- Deve permitir adicionar, editar e excluir itens da timeline.
- Os horarios devem persistir no banco e continuar apos F5.
- O sistema deve impedir intervalos invalidos e sobreposicoes.

### RF4 - Sincronizacao Publica de Produto

- A pagina publica deve calcular o produto ativo com:

```javascript
currentTime >= startTime && currentTime < endTime
```

- Ao avancar ou voltar o video, o produto ativo deve mudar imediatamente.
- Quando nao houver produto ativo, nao deve exibir produto ficticio como se fosse real.

### RF5 - Link de Pagamento por Produto

- O cadastro de produto deve possuir `paymentUrl`.
- A URL deve aceitar apenas `http://` ou `https://`.
- Produtos sem link devem ser identificados no admin como sem link configurado.
- O botao Comprar Agora deve usar o `product_id` do produto ativo na timeline.

### RF6 - Fluxo de Compra

- Ao clicar em Comprar Agora, abrir resumo do produto antes do redirecionamento.
- O resumo deve mostrar produto, imagem, nome, preco, quantidade, subtotal e total.
- O visitante deve informar dados de entrega obrigatorios.
- Ao confirmar, criar pedido real com status `pending_payment`.
- Apos criar o pedido, redirecionar para o `paymentUrl` do produto.
- O pedido nao deve ser marcado como pago sem confirmacao real externa ou acao manual autorizada.

### RF7 - Comentarios Reais

- Visitante pode enviar comentario pela live.
- Comentario deve ser salvo com `live_id`, `visitor/session_id`, mensagem e data.
- Comentarios exibidos devem vir do banco.
- Se nao houver comentarios, mostrar estado vazio.

### RF8 - Curtidas Reais

- Curtidas devem ser registradas por sessao/usuario.
- Contador deve refletir interacoes reais.
- Deve existir protecao basica contra spam por sessao.
- Nao usar `Math.random()` ou simulacao de contagem.

### RF9 - Eventos da Reproducao

- Administrador pode criar eventos vinculados ao tempo do video.
- Eventos devem ser claramente identificados como eventos da reproducao.
- Eventos nao podem fingir serem comentarios, espectadores ou compras reais.

## 7. Modelo de Dados

Entidades principais:

- `users`: administradores/influenciadores.
- `products`: produtos reais, incluindo `payment_url`, preco e estoque.
- `lives`: lives gravadas com `video_url`, titulo, status e dono.
- `live_product_timeline`: intervalos de exibicao de produtos por live.
- `live_products`: associacao entre live e produto.
- `visitors`: sessoes reais de visitantes.
- `chat_messages`: comentarios reais ou mensagens identificadas por tipo.
- `orders`: pedidos reais, com produto, comprador, total e status de pagamento.
- `video_events`: eventos configurados para reproducao.

Campos criticos de pedido:

- `id`
- `live_id`
- `visitor_id`
- `product_id`
- `buyer_name`
- `customer_phone`
- `customer_email`
- `shipping_address`
- `quantity`
- `unit_price`
- `total`
- `status = pending_payment`
- `payment_status = pending_payment`
- `created_at`

## 8. APIs Esperadas

- `POST /api/videos/upload`: upload real de video.
- `POST /api/lives`: criar live.
- `PUT /api/lives/:id`: atualizar live.
- `GET /api/lives/:id`: carregar live do admin.
- `GET /api/public/live/:slug`: carregar live publica com timeline.
- `GET /api/products`: listar produtos reais.
- `POST /api/products`: criar produto.
- `PUT /api/products/:id`: atualizar produto, incluindo `paymentUrl`.
- `POST /api/lives/:id/products`: adicionar produto na timeline.
- `PUT /api/lives/:id/products/:timelineId`: editar item da timeline.
- `DELETE /api/lives/:id/products/:timelineId`: excluir item da timeline.
- `POST /api/public/visitor`: registrar sessao real.
- `POST /api/public/chat/:liveId`: salvar comentario real.
- `POST /api/public/order`: criar pedido real pendente de pagamento.

## 9. Regras de Validacao

- Video e obrigatorio para publicar uma live replay.
- Produto da timeline deve pertencer ao administrador dono da live.
- `endTime` deve ser maior que `startTime`.
- `startTime` e `endTime` nao podem ultrapassar a duracao real do video quando conhecida.
- Intervalos nao podem se sobrepor, salvo configuracao futura explicita.
- `paymentUrl`, quando informado, deve ser URL valida com `http://` ou `https://`.
- Compra so pode prosseguir se houver produto ativo real e link de pagamento configurado.
- Pedido deve iniciar como `pending_payment`.

## 10. Criterios de Aceite

### CA1 - Player

- Abrir live publica.
- Video inicia automaticamente muted.
- Se bloqueado pelo navegador, aparece "Toque para assistir".
- Play, pause, seek, progresso e duracao funcionam.
- Refresh nao quebra a reproducao.

### CA2 - Timeline Admin

- Criar produto real.
- Abrir live no admin.
- Assistir ao video real.
- Usar tempo atual para inicio.
- Usar tempo atual para fim.
- Salvar.
- Recarregar pagina.
- Horarios permanecem.
- Editar e excluir funcionam.

### CA3 - Produto Publico

- Abrir live publica.
- Produto A aparece no intervalo configurado.
- Produto A desaparece no fim do intervalo.
- Produto B aparece no intervalo seguinte.
- Seek para frente e para tras atualiza o produto imediatamente.

### CA4 - Compra

- Produto ativo exibido.
- Comprar Agora usa o `product_id` ativo.
- Resumo mostra produto e preco corretos.
- Quantidade altera subtotal.
- Dados de entrega obrigatorios sao validados.
- Pedido e criado como `pending_payment`.
- Cliente e redirecionado para `paymentUrl` real.

### CA5 - Comentarios

- Visitante envia comentario.
- Comentario e salvo no banco.
- Comentario aparece no chat.
- Nao ha comentarios falsos.

### CA6 - Curtidas

- Visitante clica em curtir.
- Curtida real e registrada.
- Contador atualiza com base em dados reais.
- Spam basico por sessao e bloqueado.

## 11. Roadmap de Implementacao

Ordem obrigatoria:

1. Player da live: autoplay muted, fallback e controles.
2. Timeline de produtos: selecionar produto real e usar `video.currentTime`.
3. Edicao dos tempos: editar, excluir e persistir apos F5.
4. Produto ativo no player publico: sincronizacao por `currentTime`.
5. Link de pagamento: cadastro e validacao de URL.
6. Resumo do pedido: produto correto e quantidade.
7. Dados de entrega: formulario e validacao.
8. Criacao do pedido: status `pending_payment`.
9. Redirecionamento para pagamento: usar `paymentUrl` do produto ativo.
10. Comentarios reais.
11. Curtidas reais.
12. Eventos da reproducao.

Cada etapa deve seguir:

```text
IMPLEMENTAR
TESTAR
CORRIGIR
VALIDAR
AVANCAR
```

## 12. Metricas de Sucesso

- Taxa de lives publicadas com video valido.
- Percentual de produtos com link de pagamento configurado.
- Cliques em Comprar Agora por live.
- Pedidos criados com status `pending_payment`.
- Redirecionamentos para pagamento por produto.
- Comentarios reais por live.
- Curtidas reais por live.

## 13. Riscos e Dependencias

- Autoplay depende das politicas do navegador; por isso o video deve iniciar muted e ter fallback.
- Pagamento depende de URL externa cadastrada pelo administrador.
- Confirmacao de pagamento exige webhook, importacao manual ou integracao futura.
- Storage externo, quando usado, precisa estar configurado; se nao estiver, o sistema deve declarar que a integracao nao esta configurada.

## 14. Estado Atual Observado

- Projeto React + Vite com backend Express em TypeScript.
- Banco local LibSQL/SQLite em `data/local.db`.
- Upload local de video em `uploads/`.
- Schema ja possui produtos, lives, timeline, visitantes, chat e pedidos.
- Schema atual inclui `payment_url` em produtos e status de pagamento em pedidos.
- Existem rotas publicas e autenticadas para live, produtos, timeline, chat e pedidos.


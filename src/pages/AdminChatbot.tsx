import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  RotateCcw, 
  Bot, 
  User,
  Home,
  CreditCard,
  Gift,
  Wrench,
  Headphones,
  Smartphone,
  Monitor,
  Tv,
  Laptop,
  HelpCircle
} from 'lucide-react';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

type ChatState = 
  | 'inicial'
  | 'planos'
  | 'plano_mensal'
  | 'plano_trimestral'
  | 'plano_semestral'
  | 'plano_anual'
  | 'teste'
  | 'teste_android'
  | 'teste_ios'
  | 'teste_firestick'
  | 'teste_smarttv'
  | 'teste_pc'
  | 'teste_outros'
  | 'pagamento'
  | 'suporte'
  | 'atendente';

const MENU_INICIAL = `👋 Olá! Seja bem-vindo(a) à *SANPLAY IPTV* 🎬📺
Qualidade, estabilidade e o melhor do entretenimento!

Escolha uma opção abaixo 👇

1️⃣ Conhecer os Planos
2️⃣ Teste Grátis 🎁
3️⃣ Formas de Pagamento 💳
4️⃣ Suporte Técnico 🛠️
5️⃣ Falar com Atendente 👨‍💻`;

const MENU_PLANOS = `📋 *CONHECER PLANOS*

1- Plano Mensal
2- Plano Trimestral
3- Plano Semestral
4- Plano Anual

Digite a opção desejada
Para voltar digite *`;

const PLANO_MENSAL = `*PLANO MENSAL* 💰

VALORES:
1- 1 TELA: R$25,00
2- 2 TELAS: R$40,00
3- 3 TELAS: R$55,00

Digite opção ou * para voltar`;

const PLANO_TRIMESTRAL = `*PLANO TRIMESTRAL* 💰

VALORES:
1- 1 TELA: R$25/mês
2- 2 TELAS: R$40/mês
3- 3 TELAS: R$50/mês

ESCOLHA A OPÇÃO. * para voltar`;

const PLANO_SEMESTRAL = `*PLANO SEMESTRAL* 💰

VALORES:
1- 1 TELA: R$120
2- 2 TELAS: R$220
3- 3 TELAS: R$270

ESCOLHA A OPÇÃO. * para voltar`;

const PLANO_ANUAL = `*PLANO ANUAL* 💰 (12 meses)

VALORES:
1- 1 TELA: R$240 (R$20/mês)
2- 2 TELAS: R$360 (R$30/mês)
3- 3 TELAS: R$420 (R$35/mês)

* para voltar`;

const MENU_TESTE = `🎁 *TESTE GRÁTIS 4H*

EM QUAL APARELHO? 📱📺🖥️🎮

1- CELULAR ANDROID
2- CELULAR IOS
3- TV BOX
4- FIRE STICK
5- TV SMART
6- TV ANDROID
7- COMPUTADOR
8- Outros

💳 Pagamento só após teste
⏰ 4 horas de teste
* menu principal`;

const TESTE_ANDROID = `📱 *ANDROID/TV BOX/TV ANDROID*

Instale um dos apps:

📲 *IBO REVENDA*
https://play.google.com/store/apps/details?id=com.colinet.boxv3

📲 *FACILITA24*
https://play.google.com/store/apps/details?id=facilita.app

📲 *VU REVENDA*
https://play.google.com/store/apps/details?id=com.gplayer.pro

✅ Tire print após abrir pra ativar teste!
* para voltar`;

const TESTE_IOS = `📱 *IOS (iPhone/iPad)*

Baixe o app:

📲 *XCLOUD MOBILE*
https://apps.apple.com/br/app/xcloud-mobile/id6471106231

✅ Manda msg após instalar que crio usuário/senha!
* para voltar`;

const TESTE_FIRESTICK = `🔥 *FIRE STICK*

Instale o app *ZONE X*

✅ Tire print após abrir pra ativar teste!
* para voltar`;

const TESTE_SMARTTV = `📺 *TV SMART*

Me envie:
📌 Marca da TV
📸 Foto do controle

⏳ Aguarde atendimento
* para voltar`;

const TESTE_PC = `💻 *COMPUTADOR*

Abra o link que vou enviar.

⏳ Aguarde atendimento
* para voltar`;

const TESTE_OUTROS = `❓ *OUTROS APARELHOS*

Qual modelo você tem?
Informe para envio correto.

⏳ Aguardando sua resposta
* para voltar`;

const MENU_PAGAMENTO = `💳 *FORMAS DE PAGAMENTO*

✅ PIX (Mercado Pago)
✅ Cartão (até 12x)

Para Pix digite: /Pix
* para voltar`;

const MENU_SUPORTE = `🛠️ *SUPORTE TÉCNICO*

Seu chamado foi registrado!

⏳ Aguarde atendimento
* para voltar`;

const MENU_ATENDENTE = `👨‍💻 *ATENDIMENTO HUMANO*

💬 Um atendente irá responder em breve.

⏳ Aguarde resposta
* para voltar`;

export default function AdminChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatState, setChatState] = useState<ChatState>('inicial');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Mensagem inicial
    addBotMessage(MENU_INICIAL);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const addBotMessage = (content: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'bot',
        content,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 500);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'user',
      content,
      timestamp: new Date()
    }]);
  };

  const normalizeInput = (text: string): string => {
    const normalized = text.toLowerCase().trim();
    
    // Mapear emojis e texto para números
    const mappings: Record<string, string> = {
      '1️⃣': '1', 'um': '1', 'one': '1',
      '2️⃣': '2', 'dois': '2', 'two': '2',
      '3️⃣': '3', 'tres': '3', 'três': '3', 'three': '3',
      '4️⃣': '4', 'quatro': '4', 'four': '4',
      '5️⃣': '5', 'cinco': '5', 'five': '5',
      '6️⃣': '6', 'seis': '6', 'six': '6',
      '7️⃣': '7', 'sete': '7', 'seven': '7',
      '8️⃣': '8', 'oito': '8', 'eight': '8',
      'início': '*', 'inicio': '*', 'voltar': '*', 'menu': '*', 'volta': '*'
    };

    for (const [key, value] of Object.entries(mappings)) {
      if (normalized === key || normalized.includes(key)) {
        return value;
      }
    }
    
    return normalized;
  };

  const processMessage = (userInput: string) => {
    const input = normalizeInput(userInput);

    // Sempre volta ao menu inicial com *
    if (input === '*') {
      setChatState('inicial');
      addBotMessage(MENU_INICIAL);
      return;
    }

    switch (chatState) {
      case 'inicial':
        handleMenuInicial(input);
        break;
      case 'planos':
        handleMenuPlanos(input);
        break;
      case 'plano_mensal':
      case 'plano_trimestral':
      case 'plano_semestral':
      case 'plano_anual':
        // Qualquer resposta aqui pode voltar ao menu de planos ou principal
        addBotMessage('✅ Ótima escolha! Um atendente entrará em contato para finalizar.\n\n* para voltar ao menu');
        break;
      case 'teste':
        handleMenuTeste(input);
        break;
      case 'teste_android':
      case 'teste_ios':
      case 'teste_firestick':
      case 'teste_smarttv':
      case 'teste_pc':
      case 'teste_outros':
        addBotMessage('✅ Perfeito! Aguarde ativação do seu teste.\n\n* para voltar ao menu');
        break;
      case 'pagamento':
        if (input.includes('pix') || input.includes('/pix')) {
          addBotMessage('📲 *PIX*\n\nChave: exemplo@email.com\nNome: SANPLAY IPTV\n\n✅ Após pagamento, envie o comprovante!\n* para voltar');
        } else {
          addBotMessage('💳 Para pagamento em cartão, aguarde atendente.\n\n* para voltar');
        }
        break;
      case 'suporte':
      case 'atendente':
        addBotMessage('⏳ Um atendente está a caminho!\n\n* para voltar ao menu');
        break;
      default:
        addBotMessage('❌ Opção inválida. Digite * para voltar ao menu principal.');
    }
  };

  const handleMenuInicial = (input: string) => {
    switch (input) {
      case '1':
        setChatState('planos');
        addBotMessage(MENU_PLANOS);
        break;
      case '2':
        setChatState('teste');
        addBotMessage(MENU_TESTE);
        break;
      case '3':
        setChatState('pagamento');
        addBotMessage(MENU_PAGAMENTO);
        break;
      case '4':
        setChatState('suporte');
        addBotMessage(MENU_SUPORTE);
        break;
      case '5':
        setChatState('atendente');
        addBotMessage(MENU_ATENDENTE);
        break;
      default:
        addBotMessage('❌ Opção inválida. Por favor, escolha de 1 a 5 ou digite * para o menu.');
    }
  };

  const handleMenuPlanos = (input: string) => {
    switch (input) {
      case '1':
        setChatState('plano_mensal');
        addBotMessage(PLANO_MENSAL);
        break;
      case '2':
        setChatState('plano_trimestral');
        addBotMessage(PLANO_TRIMESTRAL);
        break;
      case '3':
        setChatState('plano_semestral');
        addBotMessage(PLANO_SEMESTRAL);
        break;
      case '4':
        setChatState('plano_anual');
        addBotMessage(PLANO_ANUAL);
        break;
      default:
        addBotMessage('❌ Opção inválida. Por favor, escolha de 1 a 4 ou digite * para voltar.');
    }
  };

  const handleMenuTeste = (input: string) => {
    switch (input) {
      case '1':
      case '3':
      case '6':
        setChatState('teste_android');
        addBotMessage(TESTE_ANDROID);
        break;
      case '2':
        setChatState('teste_ios');
        addBotMessage(TESTE_IOS);
        break;
      case '4':
        setChatState('teste_firestick');
        addBotMessage(TESTE_FIRESTICK);
        break;
      case '5':
        setChatState('teste_smarttv');
        addBotMessage(TESTE_SMARTTV);
        break;
      case '7':
        setChatState('teste_pc');
        addBotMessage(TESTE_PC);
        break;
      case '8':
        setChatState('teste_outros');
        addBotMessage(TESTE_OUTROS);
        break;
      default:
        addBotMessage('❌ Opção inválida. Por favor, escolha de 1 a 8 ou digite * para voltar.');
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    addUserMessage(input);
    processMessage(input);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setChatState('inicial');
    setTimeout(() => {
      addBotMessage(MENU_INICIAL);
    }, 100);
  };

  const formatMessage = (content: string) => {
    // Formatar *negrito* para bold
    let formatted = content.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    
    // Formatar links clicáveis
    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" class="text-blue-400 hover:underline break-all">$1</a>'
    );
    
    // Preservar quebras de linha
    formatted = formatted.replace(/\n/g, '<br />');
    
    return formatted;
  };

  const getStateIcon = () => {
    switch (chatState) {
      case 'inicial': return <Home className="h-4 w-4" />;
      case 'planos':
      case 'plano_mensal':
      case 'plano_trimestral':
      case 'plano_semestral':
      case 'plano_anual':
        return <CreditCard className="h-4 w-4" />;
      case 'teste':
      case 'teste_android':
      case 'teste_ios':
      case 'teste_firestick':
      case 'teste_smarttv':
      case 'teste_pc':
      case 'teste_outros':
        return <Gift className="h-4 w-4" />;
      case 'pagamento':
        return <CreditCard className="h-4 w-4" />;
      case 'suporte':
        return <Wrench className="h-4 w-4" />;
      case 'atendente':
        return <Headphones className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStateName = () => {
    const names: Record<ChatState, string> = {
      'inicial': 'Menu Inicial',
      'planos': 'Planos',
      'plano_mensal': 'Plano Mensal',
      'plano_trimestral': 'Plano Trimestral',
      'plano_semestral': 'Plano Semestral',
      'plano_anual': 'Plano Anual',
      'teste': 'Teste Grátis',
      'teste_android': 'Teste Android',
      'teste_ios': 'Teste iOS',
      'teste_firestick': 'Teste Fire Stick',
      'teste_smarttv': 'Teste Smart TV',
      'teste_pc': 'Teste PC',
      'teste_outros': 'Teste Outros',
      'pagamento': 'Pagamento',
      'suporte': 'Suporte',
      'atendente': 'Atendente'
    };
    return names[chatState] || chatState;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="h-7 w-7 text-blue-500" />
            Chatbot Interativo
          </h1>
          <p className="text-slate-400 mt-1">
            Simulador de atendimento automatizado
          </p>
        </div>
        <Button
          onClick={handleReset}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reiniciar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Simulator */}
        <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white text-lg">SANPLAY IPTV</CardTitle>
                  <CardDescription className="text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Online
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {getStateIcon()}
                <span className="ml-1">{getStateName()}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages Area */}
            <ScrollArea className="h-[500px] p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-slate-700 text-slate-100 rounded-bl-md'
                      }`}
                    >
                      <div
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                      />
                      <div className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                        {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
                <Button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 Dica: Digite * a qualquer momento para voltar ao menu principal
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Ações Rápidas</CardTitle>
              <CardDescription className="text-slate-400">
                Clique para simular respostas do usuário
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {['1', '2', '3', '4', '5', '*'].map((option) => (
                <Button
                  key={option}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => {
                    addUserMessage(option);
                    processMessage(option);
                  }}
                >
                  {option === '*' ? '🏠 Menu' : `${option}️⃣`}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Estrutura do Menu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Home className="h-4 w-4 text-blue-400" />
                <span>🏠 Menu Inicial</span>
              </div>
              <div className="ml-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <CreditCard className="h-3 w-3" />
                  <span>1️⃣ Planos → Mensal/Tri/Sem/Anual</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Gift className="h-3 w-3" />
                  <span>2️⃣ Teste → Android/iOS/TV...</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <CreditCard className="h-3 w-3" />
                  <span>3️⃣ Pagamento</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Wrench className="h-3 w-3" />
                  <span>4️⃣ Suporte</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Headphones className="h-3 w-3" />
                  <span>5️⃣ Atendente</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-700 text-slate-500">
                * volta ao menu principal
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Regras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-400">
              <p>✅ Detecta: "1️⃣", "1", "um"</p>
              <p>✅ "*" sempre volta ao menu</p>
              <p>✅ Mantém *negrito* e emojis</p>
              <p>✅ Links clicáveis</p>
              <p>✅ Respostas &lt;2s</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

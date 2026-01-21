import { forwardRef } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check, Info } from 'lucide-react';

/**
 * InstallPWA - Optional PWA installation component
 * 
 * This component offers PWA installation as a SUGGESTION, not a requirement.
 * The website works perfectly without installing as PWA.
 */
// NOTE: This component is wrapped in forwardRef because some UI libraries
// (and/or route wrappers) may try to attach a ref to it. Without forwardRef,
// React can warn and in some environments this can break rendering.
export const InstallPWA = forwardRef<HTMLDivElement>(function InstallPWA(_props, ref) {
  const { canInstall, isInstalled, isIOS, install } = usePWA();

  if (isInstalled) {
    return (
      <div ref={ref}>
        <Card className="border-success/50 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              App Instalado
            </CardTitle>
            <CardDescription>
              O aplicativo está instalado no seu dispositivo
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isIOS) {
    return (
      <div ref={ref}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Instalar no iOS (Opcional)
            </CardTitle>
            <CardDescription>
              Adicione à tela inicial para acesso rápido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Toque no botão de compartilhar (ícone de quadrado com seta)</p>
            <p>2. Role para baixo e toque em "Adicionar à Tela de Início"</p>
            <p>3. Toque em "Adicionar" para confirmar</p>
            <div className="flex items-start gap-2 mt-4 p-3 bg-muted/50 rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                A instalação é opcional. O site funciona normalmente pelo navegador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (canInstall) {
    return (
      <div ref={ref}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Instalar Aplicativo (Opcional)
            </CardTitle>
            <CardDescription>
              Instale o app para acesso rápido na tela inicial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={install} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Instalar Agora
            </Button>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                A instalação é opcional. O site funciona normalmente pelo navegador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not installable and not installed - show info that site works as is
  return null;
});


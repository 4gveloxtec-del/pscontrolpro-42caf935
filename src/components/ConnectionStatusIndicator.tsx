import { useConnectionMonitor } from '@/hooks/useConnectionMonitor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ConnectionStatusIndicatorProps {
  variant?: 'badge' | 'button' | 'detailed';
  showReconnect?: boolean;
  className?: string;
}

export function ConnectionStatusIndicator({
  variant = 'badge',
  showReconnect = true,
  className,
}: ConnectionStatusIndicatorProps) {
  const {
    status,
    isConnected,
    isConfigured,
    isChecking,
    isReconnecting,
    needsQR,
    sessionValid,
    lastCheck,
    checkConnection,
    attemptReconnect,
    getOfflineDuration,
  } = useConnectionMonitor();

  if (!isConfigured) {
    return null;
  }

  const offlineDuration = getOfflineDuration();

  // Badge variant - simple status indicator
  if (variant === 'badge') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5 cursor-default',
                isConnected
                  ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20'
                  : needsQR
                  ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20'
                  : 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/20',
                className
              )}
            >
              {isChecking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : needsQR ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {isConnected ? 'WhatsApp' : needsQR ? 'Escanear QR' : 'Offline'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isConnected
                ? 'WhatsApp conectado e funcionando'
                : needsQR
                ? 'Sessão expirada - escaneie o QR Code'
                : `WhatsApp desconectado${offlineDuration ? ` há ${offlineDuration}` : ''}`}
            </p>
            {lastCheck && (
              <p className="text-xs text-muted-foreground mt-1">
                Última verificação: {lastCheck.toLocaleTimeString()}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Button variant - clickable with popover
  if (variant === 'button') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-2',
              isConnected
                ? 'border-green-500 text-green-600 hover:bg-green-50'
                : needsQR
                ? 'border-red-500 text-red-600 hover:bg-red-50'
                : 'border-amber-500 text-amber-600 hover:bg-amber-50',
              className
            )}
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isConnected ? (
              <Wifi className="h-4 w-4" />
            ) : needsQR ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            WhatsApp
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : needsQR ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-medium">
                {isConnected
                  ? 'Conectado'
                  : needsQR
                  ? 'Sessão Expirada'
                  : 'Desconectado'}
              </span>
            </div>

            {offlineDuration && !isConnected && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Offline há {offlineDuration}
              </div>
            )}

            {lastCheck && (
              <p className="text-xs text-muted-foreground">
                Verificado às {lastCheck.toLocaleTimeString()}
              </p>
            )}

            {showReconnect && !isConnected && !needsQR && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => attemptReconnect()}
                disabled={isReconnecting}
                className="w-full"
              >
                {isReconnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reconectando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Reconectar
                  </>
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => checkConnection()}
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Agora
                </>
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Detailed variant - full status display
  return (
    <div className={cn('p-4 rounded-lg border', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-full',
              isConnected
                ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                : needsQR
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
            )}
          >
            {isChecking ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isConnected ? (
              <Wifi className="h-5 w-5" />
            ) : needsQR ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="font-medium">
              {isConnected
                ? 'WhatsApp Conectado'
                : needsQR
                ? 'Sessão Expirada'
                : 'WhatsApp Desconectado'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isConnected
                ? 'Chatbot funcionando normalmente'
                : needsQR
                ? 'É necessário escanear o QR Code'
                : offlineDuration
                ? `Offline há ${offlineDuration}`
                : 'Tentando reconectar...'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {showReconnect && !isConnected && !needsQR && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => attemptReconnect()}
              disabled={isReconnecting}
            >
              {isReconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => checkConnection()}
            disabled={isChecking}
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {!sessionValid && !needsQR && (
        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-sm text-amber-800 dark:text-amber-300">
          ⚠️ Sessão pode estar inválida. Reconexão automática em andamento...
        </div>
      )}
    </div>
  );
}

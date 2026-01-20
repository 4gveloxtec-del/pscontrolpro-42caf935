import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function AdminWipeAllData() {
  const [open, setOpen] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [step, setStep] = useState<'warning' | 'confirm'>('warning');
  const queryClient = useQueryClient();

  const wipeMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('wipe-all-data', {
        body: { confirmationCode: confirmCode }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao apagar dados');
      }

      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Todos os dados foram apagados com sucesso!', {
        description: `${data.results.sellers_deleted} revendedores e ${data.results.clients_deleted} clientes removidos.`
      });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recent-sellers'] });
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      setOpen(false);
      setStep('warning');
      setConfirmCode('');
    },
    onError: (error: Error) => {
      toast.error('Erro ao apagar dados', {
        description: error.message
      });
    }
  });

  const handleClose = () => {
    setOpen(false);
    setStep('warning');
    setConfirmCode('');
  };

  const handleProceed = () => {
    setStep('confirm');
  };

  const handleWipe = () => {
    if (confirmCode !== 'APAGAR-TUDO') {
      toast.error('Código de confirmação incorreto');
      return;
    }
    wipeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Apagar Tudo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === 'warning' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Atenção! Ação Irreversível
              </DialogTitle>
              <DialogDescription className="pt-2">
                Esta ação irá apagar <strong>permanentemente</strong>:
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 py-4">
              <Alert variant="destructive">
                <AlertDescription className="space-y-2">
                  <p>• <strong>Todos os clientes</strong> de todos os revendedores</p>
                  <p>• <strong>Todos os revendedores</strong> (exceto você, o admin)</p>
                  <p>• <strong>Todos os dados relacionados:</strong> servidores, planos, templates, painéis, etc.</p>
                </AlertDescription>
              </Alert>
              
              <p className="text-sm text-muted-foreground">
                Seu perfil de administrador será preservado, mas todos os seus clientes também serão removidos.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleProceed}>
                Entendi, continuar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-500">
                <Trash2 className="h-5 w-5" />
                Confirmar Exclusão Total
              </DialogTitle>
              <DialogDescription>
                Digite o código abaixo para confirmar a exclusão de todos os dados.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-code">
                  Digite: <code className="bg-destructive/20 text-destructive px-2 py-1 rounded font-mono">APAGAR-TUDO</code>
                </Label>
                <Input
                  id="confirm-code"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                  placeholder="Digite o código de confirmação"
                  className="font-mono"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('warning')}>
                Voltar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleWipe}
                disabled={confirmCode !== 'APAGAR-TUDO' || wipeMutation.isPending}
              >
                {wipeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Apagando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Apagar Tudo Permanentemente
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

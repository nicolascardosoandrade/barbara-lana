import { useState, useRef } from "react";
import { User, Settings, LogOut, Moon, Sun, Save, X, Loader2, Trash2, Upload, FileSpreadsheet, Users, Building2, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { useExcelImport } from "@/hooks/useExcelImport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";

export function UserMenu() {
  const { user, profile, signOut, updateProfile, updatePassword, deleteAccount } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isImporting, importType, handleFileSelect } = useExcelImport();
  
  const pacientesInputRef = useRef<HTMLInputElement>(null);
  const conveniosInputRef = useRef<HTMLInputElement>(null);
  const agendamentosInputRef = useRef<HTMLInputElement>(null);
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleOpenSettings = () => {
    setNome(profile?.nome || "");
    setEmail(profile?.email || user?.email || "");
    setNewPassword("");
    setConfirmPassword("");
    setSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);

    // Update profile if name changed
    if (nome !== profile?.nome) {
      const { error } = await updateProfile({ nome });
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar",
          description: error.message,
        });
        setIsLoading(false);
        return;
      }
    }

    // Update password if provided
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        toast({
          variant: "destructive",
          title: "Senhas não coincidem",
          description: "As senhas digitadas não são iguais.",
        });
        setIsLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        toast({
          variant: "destructive",
          title: "Senha muito curta",
          description: "A senha deve ter pelo menos 6 caracteres.",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await updatePassword(newPassword);
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao alterar senha",
          description: error.message,
        });
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(false);
    setSettingsOpen(false);
    toast({
      title: "Configurações salvas",
      description: "Suas alterações foram salvas com sucesso.",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const { error } = await deleteAccount();
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir conta",
        description: error.message,
      });
      setIsDeleting(false);
      return;
    }

    setDeleteDialogOpen(false);
    setSettingsOpen(false);
    toast({
      title: "Conta excluída",
      description: "Sua conta foi excluída com sucesso.",
    });
    navigate("/auth");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0 hover:bg-primary/90 transition-colors cursor-pointer">
            <User size={20} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {profile?.nome || "Usuário"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleOpenSettings} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
            {theme === "dark" ? (
              <>
                <Sun className="mr-2 h-4 w-4" />
                <span>Tema Claro</span>
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" />
                <span>Tema Escuro</span>
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="h-full w-full max-w-full max-h-full rounded-none sm:h-auto sm:w-auto sm:max-w-md sm:max-h-[600px] sm:rounded-lg overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
            <DialogDescription>
              Altere suas informações pessoais e preferências.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Profile Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Perfil</h3>
              <div className="space-y-2">
                <Label htmlFor="settings-nome">Nome</Label>
                <Input
                  id="settings-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">E-mail</Label>
                <Input
                  id="settings-email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado.
                </p>
              </div>
            </div>

            {/* Password Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Alterar Senha</h3>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Deixe em branco para manter a atual"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>

            {/* Theme Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Aparência</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span className="text-sm">Tema Escuro</span>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
            </div>

            {/* Import Data Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <h3 className="text-sm font-medium">Importar Dados</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Importe dados de arquivos Excel (.xlsx) exportados pelo sistema.
              </p>
              
              {/* Hidden file inputs */}
              <input
                ref={pacientesInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => handleFileSelect(e, "pacientes")}
              />
              <input
                ref={conveniosInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => handleFileSelect(e, "convenios")}
              />
              <input
                ref={agendamentosInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => handleFileSelect(e, "agendamentos")}
              />

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => pacientesInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {isImporting && importType === "pacientes" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="mr-2 h-4 w-4" />
                  )}
                  Importar Pacientes
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => conveniosInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {isImporting && importType === "convenios" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Building2 className="mr-2 h-4 w-4" />
                  )}
                  Importar Convênios
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => agendamentosInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {isImporting && importType === "agendamentos" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="mr-2 h-4 w-4" />
                  )}
                  Importar Agendamentos
                </Button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="space-y-4 border-t border-destructive/30 pt-4">
              <h3 className="text-sm font-medium text-destructive">Zona de Perigo</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Excluir Conta</p>
                  <p className="text-xs text-muted-foreground">
                    Esta ação é irreversível e excluirá todos os seus dados.
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSaveSettings} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta
              e removerá seus dados de nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Conta"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, UserPlus, KeyRound, Trash2, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { fetchAdmins, insertAdmin, deleteAdminDB, updateAdminPasswordDB, type AdminUser } from "@/lib/api.supabase";

export default function AdminsList() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isPassOpen, setIsPassOpen] = useState(false);

    const [newUsername, setNewUsername] = useState('');
    const [newPass, setNewPass] = useState('');
    const [newRole, setNewRole] = useState('manager');
    const [actionLoading, setActionLoading] = useState(false);

    const [selectedAdminId, setSelectedAdminId] = useState('');
    const [updatePass, setUpdatePass] = useState('');

    const { toast } = useToast();
    const auth = useAuthStore();

    const isSuper = auth.user?.role === 'super_admin';

    async function loadData() {
        setLoading(true);
        const data = await fetchAdmins();
        setAdmins(data);
        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async () => {
        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!newUsername || !newPass) {
            toast({ variant: 'destructive', title: 'Aviso', description: 'Preencha usuário e senha.' });
            return;
        }
        if (!passwordRegex.test(newPass)) {
            toast({ variant: 'destructive', title: 'Senha Fraca', description: 'A senha exige no mínimo 8 caracteres, contendo letras, números e símbolos.' });
            return;
        }
        setActionLoading(true);
        const res = await insertAdmin(newUsername, '', newPass, newRole);
        if (res.error) {
            toast({ variant: 'destructive', title: 'Erro', description: res.error });
        } else {
            toast({ title: 'Sucesso', description: 'Usuário cadastrado com sucesso.' });
            setIsAddOpen(false);
            setNewUsername('');
            setNewPass('');
            loadData();
        }
        setActionLoading(false);
    };

    const handleDelete = async (id: string, userToDel: string) => {
        if (id === auth.user?.id) {
            toast({ variant: 'destructive', title: 'Aviso', description: 'Você não pode excluir a si mesmo daqui.' });
            return;
        }
        if (!confirm(`Certeza que deseja remover o acesso de [${userToDel}]?`)) return;

        await deleteAdminDB(id);
        toast({ title: 'Excluído', description: 'O usuário foi removido do painel.' });
        loadData();
    };

    const openChangePass = (id: string) => {
        setSelectedAdminId(id);
        setUpdatePass('');
        setIsPassOpen(true);
    };

    const handleUpdatePass = async () => {
        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!passwordRegex.test(updatePass)) {
            toast({ variant: 'destructive', title: 'Senha Fraca', description: 'A senha exige no mínimo 8 caracteres, contendo letras, números e símbolos.' });
            return;
        }
        setActionLoading(true);
        await updateAdminPasswordDB(selectedAdminId, updatePass);
        toast({ title: 'Sucesso', description: 'A senha do usuário foi substituída.' });
        setIsPassOpen(false);
        setActionLoading(false);
    };

    if (!isSuper && auth.user?.role !== 'admin') {
        return (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center p-8 text-center text-slate-400">
                <ShieldAlert className="mb-4 size-16 text-slate-600" />
                <p>Seu perfil de acesso ({auth.user?.role}) não permite visualizar ou gerenciar Pessoal e Credenciais Administrativas.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
                <div>
                    <h1 className="font-heading text-xl sm:text-2xl font-bold text-text-primary flex items-center gap-2">
                        <ShieldCheck className="size-6 text-primary" /> Equipe Administrativa
                    </h1>
                    <p className="text-xs sm:text-sm text-text-secondary mt-1">
                        Gerenciamento de acessos e credenciais do HoraFace
                    </p>
                </div>
                {isSuper && (
                    <Button onClick={() => setIsAddOpen(true)} className="gap-2 bg-primary text-black hover:bg-primary/90 self-start sm:self-auto">
                        <UserPlus className="size-4" /> Novo Usuário
                    </Button>
                )}
            </div>

            <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-border bg-surface p-0 sm:p-4 overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-500" /></div>
                    ) : admins.length === 0 ? (
                        <p className="p-8 text-center text-slate-500">Nenhum registro administrativo localizado além do Master offline.</p>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-elevated text-xs uppercase text-slate-400 border-b border-border">
                                <tr>
                                    <th className="px-6 py-4">Usuário</th>
                                    <th className="px-6 py-4">Patente/Acesso</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {admins.map(ad => (
                                    <tr key={ad.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-white flex items-center gap-2">
                                            {ad.role === 'super_admin' ? <ShieldCheck className="w-4 h-4 text-yellow-500" /> : <ShieldAlert className="w-4 h-4 text-slate-500" />}
                                            <div className="flex flex-col">
                                                <span>{ad.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="inline-block rounded-full bg-slate-800 px-3 py-1 text-xs">
                                                {ad.role === 'super_admin' ? 'Super Admin' : ad.role === 'manager' ? 'Gestor' : ad.role === 'viewer' ? 'Auditor / Visão' : ad.role}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-emerald-400">
                                            Ativo
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {(isSuper || ad.id === auth.user?.id) && (
                                                <Button variant="ghost" size="sm" onClick={() => openChangePass(ad.id)} className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20 mr-2">
                                                    <KeyRound className="w-4 h-4 mr-1" /> Senha
                                                </Button>
                                            )}
                                            {isSuper && ad.role !== 'super_admin' && (
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(ad.id, ad.username)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogContent className="border-border bg-surface sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-white">Conceder Acesso Sistêmico</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Crie um login seguro para outro membro da sua empresa. Ele perderá a senha se esquecer (só você poderá redefinir).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400">Novo Login</label>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                                    placeholder="ex: jose.rh"
                                    className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400">Senha Inicial</label>
                                <input
                                    type="password"
                                    value={newPass}
                                    onChange={e => setNewPass(e.target.value)}
                                    placeholder="Letras, números e símbolos (mín. 8)"
                                    className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400">Nível de Poder (RBAC)</label>
                                <Select value={newRole} onValueChange={setNewRole}>
                                    <SelectTrigger className="w-full border-border bg-elevated text-sm text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-surface text-white">
                                        <SelectItem value="manager">Gestor de Cadastros (Adiciona Prestadores)</SelectItem>
                                        <SelectItem value="viewer">Auditor Financeiro (Apenas Visualização e Relatórios)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="mt-4 gap-2 border-t border-border pt-4 sm:space-x-0">
                            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-border hover:bg-elevated hover:text-white">
                                Cancelar
                            </Button>
                            <Button onClick={handleCreate} disabled={actionLoading} className="bg-primary text-black hover:bg-primary/90">
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Criar Credencial
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isPassOpen} onOpenChange={setIsPassOpen}>
                    <DialogContent className="border-border bg-surface sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-white">Alterar Senha de Acesso</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400">Nova Senha</label>
                                <input
                                    type="text"
                                    value={updatePass}
                                    onChange={e => setUpdatePass(e.target.value)}
                                    placeholder="Letras, números e símbolos (mín. 8)"
                                    className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> A criptografia Bcrypt será gerada automaticamente.</p>
                            </div>
                        </div>
                        <DialogFooter className="mt-4 gap-2 border-t border-border pt-4 sm:space-x-0">
                            <Button variant="outline" onClick={() => setIsPassOpen(false)} className="border-border hover:bg-elevated hover:text-white">
                                Cancelar
                            </Button>
                            <Button onClick={handleUpdatePass} disabled={actionLoading} className="bg-primary text-black hover:bg-primary/90">
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Salvar Nova Senha
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, UserPlus, KeyRound, Trash2, Loader2, Info, Edit2, X, Eye, EyeOff } from "lucide-react";
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
import { fetchAdmins, insertAdmin, deleteAdminDB, updateAdminPasswordDB, updateAdmin, type AdminUser } from "@/lib/api.supabase";

const PERMISSION_OPTIONS = [
    { key: 'dashboard', label: 'Painel (Dashboard)', description: 'Visualizar resumo geral' },
    { key: 'timeclock', label: 'Aferição de Horas', description: 'Marcação manual de ponto' },
    { key: 'providers', label: 'Prestadores', description: 'Criar, editar e gerenciar colaboradores' },
    { key: 'chat', label: 'Chat Gestão', description: 'Conversar com os prestadores' },
    { key: 'shifts', label: 'Turnos', description: 'Criar e editar escalas de turno' },
    { key: 'reports', label: 'Relatórios', description: 'Fechamento, extrato e auditoria' },
    { key: 'holidays', label: 'Calendários', description: 'Gerenciar feriados e datas especiais' },
    { key: 'kiosks', label: 'Monitor Quiosques', description: 'Administrar tablets/quiosques' },
    { key: 'team', label: 'Equipe Gestora', description: 'Gerenciar outros administradores' },
    { key: 'settings', label: 'Configurações', description: 'Configurações do sistema' },
];

export default function AdminsList() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isPassOpen, setIsPassOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState('');

    // Form fields
    const [formDisplayName, setFormDisplayName] = useState('');
    const [formUsername, setFormUsername] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPass, setFormPass] = useState('');
    const [formRole, setFormRole] = useState('manager');
    const [formPermissions, setFormPermissions] = useState<string[]>([]);
    const [showPass, setShowPass] = useState(false);

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

    useEffect(() => { loadData(); }, []);

    const resetForm = () => {
        setFormDisplayName('');
        setFormUsername('');
        setFormEmail('');
        setFormPass('');
        setFormRole('manager');
        setFormPermissions([]);
        setShowPass(false);
        setIsEditing(false);
        setEditingId('');
    };

    const openCreate = () => {
        resetForm();
        setIsFormOpen(true);
    };

    const openEdit = (admin: AdminUser) => {
        setIsEditing(true);
        setEditingId(admin.id);
        setFormDisplayName(admin.displayName || '');
        setFormUsername(admin.username);
        setFormEmail(admin.email || '');
        setFormRole(admin.role);
        setFormPermissions(admin.permissions || []);
        setFormPass('');
        setIsFormOpen(true);
    };

    const togglePermission = (key: string) => {
        setFormPermissions(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const selectAllPermissions = () => {
        setFormPermissions(PERMISSION_OPTIONS.map(p => p.key));
    };

    const clearAllPermissions = () => {
        setFormPermissions([]);
    };

    const handleSave = async () => {
        if (!formDisplayName.trim()) {
            toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Preencha o Nome Completo do gestor.' });
            return;
        }
        if (!formUsername.trim()) {
            toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Preencha o Login de acesso.' });
            return;
        }

        if (isEditing) {
            setActionLoading(true);
            await updateAdmin(editingId, {
                displayName: formDisplayName,
                role: formRole,
                permissions: formPermissions
            });
            toast({ title: 'Atualizado!', description: `Permissões de ${formDisplayName} foram salvas.` });
            setIsFormOpen(false);
            resetForm();
            loadData();
            setActionLoading(false);
            return;
        }

        // Create mode
        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!formPass) {
            toast({ variant: 'destructive', title: 'Campo obrigatório', description: 'Defina uma senha inicial.' });
            return;
        }
        if (!passwordRegex.test(formPass)) {
            toast({ variant: 'destructive', title: 'Senha Fraca', description: 'A senha exige mínimo 8 caracteres, com letras, números e símbolos.' });
            return;
        }

        setActionLoading(true);
        const res = await insertAdmin(formUsername, formEmail, formPass, formRole, formDisplayName, formPermissions);
        if (res.error) {
            toast({ variant: 'destructive', title: 'Erro', description: res.error });
        } else {
            toast({ title: 'Gestor criado!', description: `${formDisplayName} agora tem acesso ao sistema.` });
            setIsFormOpen(false);
            resetForm();
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

    const getRoleBadge = (role: string) => {
        if (role === 'super_admin') return { label: 'Super Admin', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' };
        if (role === 'manager') return { label: 'Gestor', cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
        if (role === 'viewer') return { label: 'Auditor', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/30' };
        return { label: role, cls: 'bg-slate-800 text-slate-300 border-slate-700' };
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
                        Gerenciamento de acessos, credenciais e permissões do HoraFace
                    </p>
                </div>
                {isSuper && (
                    <Button onClick={openCreate} className="gap-2 bg-primary text-black hover:bg-primary/90 self-start sm:self-auto">
                        <UserPlus className="size-4" /> Novo Gestor
                    </Button>
                )}
            </div>

            <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-border bg-surface p-0 sm:p-4 overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-500" /></div>
                    ) : admins.length === 0 ? (
                        <p className="p-8 text-center text-slate-500">Nenhum registro administrativo localizado.</p>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-elevated text-xs uppercase text-slate-400 border-b border-border">
                                <tr>
                                    <th className="px-4 sm:px-6 py-4">Gestor</th>
                                    <th className="px-4 sm:px-6 py-4">Acesso</th>
                                    <th className="px-4 sm:px-6 py-4 hidden md:table-cell">Permissões</th>
                                    <th className="px-4 sm:px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {admins.map(ad => {
                                    const badge = getRoleBadge(ad.role);
                                    return (
                                        <tr key={ad.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex items-center justify-center size-10 rounded-full ${ad.role === 'super_admin' ? 'bg-yellow-500/10' : 'bg-cyan-500/10'}`}>
                                                        {ad.role === 'super_admin'
                                                            ? <ShieldCheck className="size-5 text-yellow-400" />
                                                            : <ShieldAlert className="size-5 text-cyan-400" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white">{ad.displayName || ad.username}</p>
                                                        <p className="text-[11px] text-slate-500 font-mono">@{ad.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                                                {ad.role === 'super_admin' ? (
                                                    <span className="text-[11px] text-yellow-400/80 italic">Acesso Total</span>
                                                ) : (ad.permissions && ad.permissions.length > 0) ? (
                                                    <div className="flex flex-wrap gap-1 max-w-[280px]">
                                                        {ad.permissions.map(p => (
                                                            <span key={p} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-700">
                                                                {PERMISSION_OPTIONS.find(o => o.key === p)?.label || p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-600 italic">Nenhuma</span>
                                                )}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {isSuper && ad.role !== 'super_admin' && (
                                                        <Button variant="ghost" size="sm" onClick={() => openEdit(ad)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20">
                                                            <Edit2 className="w-4 h-4 mr-1" /> Editar
                                                        </Button>
                                                    )}
                                                    {(isSuper || ad.id === auth.user?.id) && (
                                                        <Button variant="ghost" size="sm" onClick={() => openChangePass(ad.id)} className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20">
                                                            <KeyRound className="w-4 h-4 mr-1" /> Senha
                                                        </Button>
                                                    )}
                                                    {isSuper && ad.role !== 'super_admin' && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(ad.id, ad.displayName || ad.username)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* === FORM DIALOG (Create / Edit) === */}
                <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) { setIsFormOpen(false); resetForm(); } }}>
                    <DialogContent className="border-border bg-surface sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                {isEditing ? <Edit2 className="size-5 text-blue-400" /> : <UserPlus className="size-5 text-primary" />}
                                {isEditing ? 'Editar Gestor' : 'Novo Gestor'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-400">
                                {isEditing
                                    ? 'Atualize as informações e permissões deste gestor.'
                                    : 'Cadastre um novo membro da equipe com as permissões adequadas.'
                                }
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-5 py-2">

                            {/* Nome Completo */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nome Completo *</label>
                                <input
                                    type="text"
                                    value={formDisplayName}
                                    onChange={e => setFormDisplayName(e.target.value)}
                                    placeholder="Ex: José da Silva"
                                    className="w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            {/* Login */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Login de Acesso *</label>
                                <input
                                    type="text"
                                    value={formUsername}
                                    onChange={e => setFormUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                                    placeholder="ex: jose.rh"
                                    disabled={isEditing}
                                    className="w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                                />
                                {isEditing && <p className="text-[10px] text-slate-600">O login não pode ser alterado.</p>}
                            </div>

                            {/* Email (opcional) */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email <span className="text-slate-600">(opcional)</span></label>
                                <input
                                    type="email"
                                    value={formEmail}
                                    onChange={e => setFormEmail(e.target.value)}
                                    placeholder="jose@empresa.com"
                                    disabled={isEditing}
                                    className="w-full rounded-md border border-border bg-elevated px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Senha (só na criação) */}
                            {!isEditing && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Senha Inicial *</label>
                                    <div className="relative">
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            value={formPass}
                                            onChange={e => setFormPass(e.target.value)}
                                            placeholder="Letras, números e símbolos (mín. 8)"
                                            className="w-full rounded-md border border-border bg-elevated px-3 py-2.5 pr-10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                            {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Nível de Acesso */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nível de Acesso</label>
                                <Select value={formRole} onValueChange={setFormRole}>
                                    <SelectTrigger className="w-full border-border bg-elevated text-sm text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-surface text-white">
                                        <SelectItem value="manager">Gestor (Pode criar e editar)</SelectItem>
                                        <SelectItem value="viewer">Auditor (Apenas visualização)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Permissões */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Permissões de Acesso</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={selectAllPermissions} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold">
                                            Marcar todas
                                        </button>
                                        <span className="text-slate-700">|</span>
                                        <button type="button" onClick={clearAllPermissions} className="text-[10px] text-slate-500 hover:text-slate-400 font-semibold">
                                            Limpar
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {PERMISSION_OPTIONS.map(opt => {
                                        const checked = formPermissions.includes(opt.key);
                                        return (
                                            <label
                                                key={opt.key}
                                                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                                                    checked
                                                        ? 'border-cyan-500/40 bg-cyan-950/20'
                                                        : 'border-border bg-elevated/50 hover:border-slate-600'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => togglePermission(opt.key)}
                                                    className="mt-0.5 accent-cyan-500 size-4"
                                                />
                                                <div>
                                                    <p className={`text-sm font-medium ${checked ? 'text-cyan-300' : 'text-slate-300'}`}>
                                                        {opt.label}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500">{opt.description}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-600 flex items-center gap-1">
                                    <Info className="size-3" /> O Super Admin sempre tem acesso total, independente das marcações.
                                </p>
                            </div>
                        </div>
                        <DialogFooter className="mt-4 gap-2 border-t border-border pt-4 sm:space-x-0">
                            <Button variant="outline" onClick={() => { setIsFormOpen(false); resetForm(); }} className="border-border hover:bg-elevated hover:text-white">
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={actionLoading} className="bg-primary text-black hover:bg-primary/90">
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {isEditing ? 'Salvar Alterações' : 'Criar Gestor'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* === PASSWORD DIALOG === */}
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
                                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> A criptografia será gerada automaticamente.</p>
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

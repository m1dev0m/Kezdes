import { useState, useEffect } from 'react';
import {
    Plus, Trash2, Pencil, X, Save,
    UtensilsCrossed, Eye, EyeOff, Upload, Image
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useI18n } from '@/i18n';

interface Category {
    id: number;
    name: string;
    order: number;
    is_active: boolean;
}

interface Item {
    id: number;
    name: string;
    description: string;
    price: number;
    image: string | null;
    image_url: string | null;
    is_available: boolean;
    is_active: boolean;
    category: number | null;
    category_name?: string;
}

export default function Menu() {
    const { t } = useI18n();
    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<number | null>(null);

    const [catModal, setCatModal] = useState(false);
    const [catForm, setCatForm] = useState({ name: '', id: 0 });
    const [catSaving, setCatSaving] = useState(false);

    const [itemModal, setItemModal] = useState(false);
    const [itemForm, setItemForm] = useState({
        id: 0, name: '', description: '', price: 0, category: null as number | null,
        is_available: true, imageFile: null as File | null,
    });
    const [itemSaving, setItemSaving] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'item'; id: number } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cRes, iRes] = await Promise.all([
                api.get('/admin/categories/'),
                api.get('/admin/items/'),
            ]);
            setCategories(Array.isArray(cRes.data) ? cRes.data : cRes.data.results || []);
            setItems(Array.isArray(iRes.data) ? iRes.data : iRes.data.results || []);
        } catch {
            toast.error(t('menu.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const openCatModal = (cat?: Category) => {
        setCatForm({ name: cat?.name || '', id: cat?.id || 0 });
        setCatModal(true);
    };

    const saveCat = async () => {
        setCatSaving(true);
        try {
            if (catForm.id) {
                await api.patch(`/admin/categories/${catForm.id}/`, { name: catForm.name });
            } else {
                await api.post('/admin/categories/', { name: catForm.name });
            }
            toast.success(catForm.id ? t('menu.categoryUpdated') : t('menu.categoryCreated'));
            setCatModal(false);
            loadData();
        } catch {
            toast.error(t('menu.failedToSaveCategory'));
        } finally {
            setCatSaving(false);
        }
    };

    const deleteCat = async (id: number) => {
        try {
            await api.delete(`/admin/categories/${id}/`);
            toast.success(t('menu.categoryDeleted'));
            if (activeCategory === id) setActiveCategory(null);
            loadData();
            setDeleteTarget(null);
        } catch {
            toast.error(t('menu.failedToDeleteCategory'));
        }
    };

    const openItemModal = (item?: Item) => {
        if (item) {
            setItemForm({
                id: item.id, name: item.name, description: item.description || '',
                price: item.price, category: item.category, is_available: item.is_available,
                imageFile: null,
            });
            setImagePreview(item.image || item.image_url || null);
        } else {
            setItemForm({
                id: 0, name: '', description: '', price: 0,
                category: activeCategory, is_available: true, imageFile: null,
            });
            setImagePreview(null);
        }
        setItemModal(true);
    };

    const saveItem = async () => {
        setItemSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', itemForm.name);
            formData.append('description', itemForm.description);
            formData.append('price', String(itemForm.price));
            formData.append('is_available', String(itemForm.is_available));
            if (itemForm.category) formData.append('category', String(itemForm.category));
            if (itemForm.imageFile) formData.append('image', itemForm.imageFile);

            if (itemForm.id) {
                await api.patch(`/admin/items/${itemForm.id}/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await api.post('/admin/items/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            toast.success(itemForm.id ? t('menu.itemUpdated') : t('menu.itemCreated'));
            setItemModal(false);
            loadData();
        } catch {
            toast.error(t('menu.failedToSaveItem'));
        } finally {
            setItemSaving(false);
        }
    };

    const deleteItem = async (id: number) => {
        try {
            await api.delete(`/admin/items/${id}/`);
            toast.success(t('menu.itemDeleted'));
            loadData();
            setDeleteTarget(null);
        } catch {
            toast.error(t('menu.failedToDeleteItem'));
        }
    };

    const toggleAvailability = async (item: Item) => {
        try {
            await api.patch(`/admin/items/${item.id}/`, { is_available: !item.is_available });
            toast.success(item.is_available ? t('menu.markedUnavailable') : t('menu.markedAvailable'));
            loadData();
        } catch {
            toast.error(t('menu.failedToUpdateItem'));
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setItemForm(f => ({ ...f, imageFile: file }));
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const filteredItems = activeCategory
        ? items.filter(i => i.category === activeCategory)
        : items;

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('menu.title')}</h1>
                    <p className="text-slate-500 font-medium mt-1">{t('menu.description')}</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => openCatModal()}>
                        <Plus size={16} className="mr-2" /> {t('menu.category')}
                    </Button>
                    <Button variant="primary" onClick={() => openItemModal()}>
                        <Plus size={16} className="mr-2" /> {t('menu.newItem')}
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
                <button
                    onClick={() => setActiveCategory(null)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${!activeCategory ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {t('menu.all')}
                </button>
                {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-1 group relative">
                        <button
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {cat.name}
                        </button>
                        <div className="hidden group-hover:flex items-center gap-0.5 absolute -right-2 -top-2 z-10">
                            <button onClick={() => openCatModal(cat)} className="p-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                <Pencil size={10} />
                            </button>
                            <button onClick={() => setDeleteTarget({ type: 'category', id: cat.id })} className="p-1 bg-white dark:bg-slate-700 rounded-lg shadow-lg text-rose-400 hover:text-rose-600">
                                <Trash2 size={10} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64 rounded-[2rem]" count={6} />
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-20 text-center">
                    <UtensilsCrossed size={48} className="mx-auto mb-4 text-slate-200" />
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t('menu.noItems')}</h3>
                    <p className="text-sm text-slate-400 mt-1">{t('menu.noItemsDesc')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map((item) => (
                        <div key={item.id} className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden hover:shadow-xl transition-all group ${!item.is_available ? 'opacity-60' : ''}`}>
                            <div className="h-40 bg-slate-50 dark:bg-slate-800 relative overflow-hidden">
                                {item.image || item.image_url ? (
                                    <img src={item.image || item.image_url || ''} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                        <Image size={48} />
                                    </div>
                                )}
                                <button
                                    onClick={() => toggleAvailability(item)}
                                    className={`absolute top-3 right-3 p-2 rounded-xl shadow-lg backdrop-blur-sm transition-all ${item.is_available ? 'bg-emerald-500/90 text-white hover:bg-emerald-600' : 'bg-rose-500/90 text-white hover:bg-rose-600'}`}
                                >
                                    {item.is_available ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">{item.name}</h3>
                                    <span className="text-lg font-black text-slate-900 dark:text-white whitespace-nowrap ml-4">₸{item.price?.toLocaleString()}</span>
                                </div>
                                {item.description && (
                                    <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4">{item.description}</p>
                                )}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {categories.find(c => c.id === item.category)?.name || t('menu.uncategorized')}
                                    </span>
                                    <div className="flex gap-1">
                                        <button onClick={() => openItemModal(item)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => setDeleteTarget({ type: 'item', id: item.id })} className="p-2 text-rose-300 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {catModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCatModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{catForm.id ? t('menu.editCategory') : t('menu.newCategory')}</h3>
                            <button onClick={() => setCatModal(false)} className="p-2 text-slate-400 hover:text-slate-700"><X size={20} /></button>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('menu.name')}</label>
                            <input
                                type="text"
                                value={catForm.name}
                                onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. Appetizers"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-slate-900 dark:focus:border-slate-500 transition-colors"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => setCatModal(false)}>{t('menu.cancel')}</Button>
                            <Button variant="primary" className="flex-1" onClick={saveCat} isLoading={catSaving}>{t('menu.save')}</Button>
                        </div>
                    </div>
                </div>
            )}

            {itemModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setItemModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg p-8 space-y-6 shadow-2xl my-8" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{itemForm.id ? t('menu.editItem') : t('menu.newItemTitle')}</h3>
                            <button onClick={() => setItemModal(false)} className="p-2 text-slate-400 hover:text-slate-700"><X size={20} /></button>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('menu.photo')}</label>
                            <div className="relative w-full h-40 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-700">
                                {imagePreview ? (
                                    <img src={imagePreview} className="w-full h-full object-cover" alt="preview" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                        <Upload size={24} />
                                        <span className="text-xs mt-2">{t('menu.clickToUpload')}</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-full">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('menu.name')}</label>
                                <input type="text" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-slate-900 transition-colors" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('menu.price')}</label>
                                <input type="number" min={0} value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: Number(e.target.value) }))} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-slate-900 transition-colors" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('menu.selectCategory')}</label>
                                <select value={itemForm.category ?? ''} onChange={e => setItemForm(f => ({ ...f, category: e.target.value ? Number(e.target.value) : null }))} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-slate-900 transition-colors">
                                    <option value="">{t('menu.noCategory')}</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-full">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('menu.itemDescription')}</label>
                                <textarea value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-slate-900 transition-colors resize-none" />
                            </div>
                            <div className="col-span-full flex items-center gap-3">
                                <input type="checkbox" checked={itemForm.is_available} onChange={e => setItemForm(f => ({ ...f, is_available: e.target.checked }))} id="available" className="w-5 h-5 rounded-lg accent-slate-900" />
                                <label htmlFor="available" className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('menu.availableForOrdering')}</label>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => setItemModal(false)}>{t('menu.cancel')}</Button>
                            <Button variant="primary" className="flex-1" onClick={saveItem} isLoading={itemSaving}>
                                <Save size={14} className="mr-2" /> {t('menu.saveItem')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                title={deleteTarget?.type === 'category' ? t('menu.deleteCategoryTitle') : t('menu.deleteItemTitle')}
                description={t('menu.deleteDesc')}
                confirmLabel={t('menu.delete')}
                onConfirm={() => {
                    if (!deleteTarget) return;
                    if (deleteTarget.type === 'category') {
                        deleteCat(deleteTarget.id);
                    } else {
                        deleteItem(deleteTarget.id);
                    }
                }}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

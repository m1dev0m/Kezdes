import { useState, useEffect } from 'react';
import {
    Plus, Trash2, Pencil,
    UtensilsCrossed, Upload, ChevronRight
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

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
}

export default function Menu() {
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
            toast.error("Failed to load digital menu");
        } finally {
            setLoading(false);
        }
    };

    const saveCat = async () => {
        if (!catForm.name.trim()) return;
        setCatSaving(true);
        try {
            if (catForm.id) {
                await api.patch(`/admin/categories/${catForm.id}/`, { name: catForm.name });
            } else {
                await api.post('/admin/categories/', { name: catForm.name });
            }
            toast.success("Category saved");
            setCatModal(false);
            loadData();
        } catch {
            toast.error("Operation failed");
        } finally {
            setCatSaving(false);
        }
    };

    const deleteCat = async (id: number) => {
        if (!confirm("Are you sure? This will hide categories but and items might lose their link.")) return;
        try {
            await api.delete(`/admin/categories/${id}/`);
            toast.success("Category removed");
            loadData();
        } catch {
            toast.error("Delete failed");
        }
    };

    const saveItem = async () => {
        if (!itemForm.name.trim()) return;
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
            toast.success("Item saved");
            setItemModal(false);
            loadData();
        } catch {
            toast.error("Operation failed");
        } finally {
            setItemSaving(false);
        }
    };

    const filteredItems = activeCategory
        ? items.filter(i => i.category === activeCategory)
        : items;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C5A059]"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-[#1A3C34] tracking-tighter italic">Digital Catalog</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Manage categories and offerings</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => { setCatForm({ name: '', id: 0 }); setCatModal(true); }}
                        className="h-12 px-6 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest hover:border-[#1A3C34] transition-all flex items-center gap-2"
                    >
                        <Plus size={16} /> Category
                    </button>
                    <button
                        onClick={() => {
                            setItemForm({ id: 0, name: '', description: '', price: 0, category: activeCategory, is_available: true, imageFile: null });
                            setImagePreview(null);
                            setItemModal(true);
                        }}
                        className="h-12 px-8 rounded-xl bg-[#1A3C34] text-white text-xs font-black uppercase tracking-widest hover:bg-[#234e44] transition-all flex items-center gap-2 shadow-xl shadow-[#1A3C34]/10"
                    >
                        <Plus size={16} /> Add Item
                    </button>
                </div>
            </header>

            <div className="flex gap-10">
                {}
                <aside className="w-64 shrink-0 space-y-8">
                    <div>
                        <h3 className="text-[10px] font-black text-[#1A3C34] uppercase tracking-[0.2em] mb-4 ml-1">Menu Flow</h3>
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveCategory(null)}
                                className={`w-full px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all flex items-center justify-between ${!activeCategory ? 'bg-[#1A3C34] text-white' : 'text-slate-400 hover:bg-white border border-transparent hover:border-slate-100'}`}
                            >
                                All Items
                                {!activeCategory && <ChevronRight size={14} />}
                            </button>
                            {categories.map(cat => (
                                <div key={cat.id} className="group relative">
                                    <button
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`w-full px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all flex items-center justify-between ${activeCategory === cat.id ? 'bg-[#C5A059] text-white' : 'text-slate-400 hover:bg-white border border-transparent hover:border-slate-100'}`}
                                    >
                                        <span className="truncate pr-4">{cat.name}</span>
                                        {activeCategory === cat.id && <ChevronRight size={14} />}
                                    </button>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); setCatForm({ name: cat.name, id: cat.id }); setCatModal(true); }} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-[#1A3C34]">
                                            <Pencil size={10} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteCat(cat.id); }} className="p-1.5 bg-white border border-slate-200 rounded-lg text-rose-400 hover:text-rose-600">
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {}
                <main className="flex-1">
                    <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
                        {filteredItems.length === 0 ? (
                            <div className="col-span-full py-32 text-center bg-white border border-dashed border-slate-200 rounded-[3rem]">
                                <UtensilsCrossed size={48} className="mx-auto mb-4 text-slate-100" />
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Inventory currently empty</p>
                            </div>
                        ) : (
                            filteredItems.map(item => (
                                <div key={item.id} className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden group hover:border-[#C5A059] transition-all shadow-sm flex flex-col">
                                    <div className="h-56 bg-[#FDFBF7] relative overflow-hidden">
                                        {(item.image || item.image_url) ? (
                                            <img src={item.image || item.image_url || ''} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt={item.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                <UtensilsCrossed size={48} />
                                            </div>
                                        )}
                                        <div className="absolute top-5 right-5 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setItemForm({
                                                        id: item.id, name: item.name, description: item.description || '',
                                                        price: item.price, category: item.category, is_available: item.is_available,
                                                        imageFile: null
                                                    });
                                                    setImagePreview(item.image || item.image_url);
                                                    setItemModal(true);
                                                }}
                                                className="p-3 bg-white/90 backdrop-blur rounded-2xl text-slate-600 hover:text-[#1A3C34] shadow-lg shadow-black/5"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        </div>
                                        {!item.is_available && (
                                            <div className="absolute inset-0 bg-[#1A3C34]/40 backdrop-blur-[2px] flex items-center justify-center">
                                                <span className="px-5 py-2.5 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Out of Stock</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-8 space-y-3 flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xl font-black text-[#1A3C34] italic tracking-tight">{item.name}</h4>
                                            <span className="text-lg font-black text-[#C5A059] italic">₸{item.price?.toLocaleString()}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed line-clamp-2 italic">
                                            {item.description || 'Gourmet preparation details to follow'}
                                        </p>
                                    </div>
                                    <div className="px-8 py-5 border-t border-slate-50 bg-[#FDFBF7]/50 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-[#C5A059] uppercase tracking-widest">
                                            {categories.find(c => c.id === item.category)?.name || 'House Special'}
                                        </span>
                                        <label className="flex items-center gap-3 cursor-pointer group/toggle">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover/toggle:text-[#1A3C34] transition-colors">Availability</span>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${item.is_available ? 'bg-[#1A3C34]' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${item.is_available ? 'left-6' : 'left-1'}`} />
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>

            {}
            {catModal && (
                <div className="fixed inset-0 bg-[#1A3C34]/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 shadow-2xl relative">
                        <h3 className="text-2xl font-black text-[#1A3C34] tracking-tighter italic mb-8">Category</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Title</label>
                                <input
                                    value={catForm.name}
                                    onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-5 py-4 bg-[#FDFBF7] border border-transparent focus:border-[#1A3C34] rounded-2xl text-xs font-black outline-none transition-all italic"
                                    placeholder="Ex: Main Courses"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setCatModal(false)} className="h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#1A3C34]">Discard</button>
                                <button onClick={saveCat} disabled={catSaving} className="h-12 rounded-xl bg-[#1A3C34] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#234e44] shadow-lg shadow-[#1A3C34]/10">
                                    {catSaving ? '...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {itemModal && (
                <div className="fixed inset-0 bg-[#1A3C34]/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg p-12 shadow-2xl relative my-8">
                        <h3 className="text-3xl font-black text-[#1A3C34] tracking-tighter italic mb-10">Item Specification</h3>
                        <div className="space-y-8">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Presentation Image</label>
                                <div className="h-44 bg-[#FDFBF7] border-2 border-dashed border-slate-100 rounded-[2rem] relative overflow-hidden group">
                                    {imagePreview ? (
                                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                                            <Upload size={32} />
                                            <span className="text-[9px] font-black uppercase mt-3 tracking-widest">Select High-Res Asset</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setItemForm(f => ({ ...f, imageFile: file }));
                                                setImagePreview(URL.createObjectURL(file));
                                            }
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-full">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Dish Title</label>
                                    <input
                                        value={itemForm.name}
                                        onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                                        className="w-full px-5 py-4 bg-[#FDFBF7] border border-transparent focus:border-[#1A3C34] rounded-2xl text-xs font-black outline-none transition-all italic"
                                        placeholder="Gourmet Platter"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Retail Price (₸)</label>
                                    <input
                                        type="number"
                                        value={itemForm.price}
                                        onChange={e => setItemForm(f => ({ ...f, price: Number(e.target.value) }))}
                                        className="w-full px-5 py-4 bg-[#FDFBF7] border border-transparent focus:border-[#1A3C34] rounded-2xl text-xs font-black outline-none transition-all italic"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Category Link</label>
                                    <select
                                        value={itemForm.category ?? ''}
                                        onChange={e => setItemForm(f => ({ ...f, category: e.target.value ? Number(e.target.value) : null }))}
                                        className="w-full px-5 py-4 bg-[#FDFBF7] border border-transparent focus:border-[#1A3C34] rounded-2xl text-xs font-black outline-none transition-all italic appearance-none"
                                    >
                                        <option value="">House Special</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-full">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Culinary Description</label>
                                    <textarea
                                        value={itemForm.description}
                                        onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                                        rows={3}
                                        className="w-full px-5 py-4 bg-[#FDFBF7] border border-transparent focus:border-[#1A3C34] rounded-2xl text-xs font-black outline-none transition-all italic leading-relaxed"
                                        placeholder="Detail the preparation and key ingredients..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6">
                                <button onClick={() => setItemModal(false)} className="h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#1A3C34]">Discard</button>
                                <button onClick={saveItem} disabled={itemSaving} className="h-14 rounded-2xl bg-[#1A3C34] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#234e44] shadow-xl shadow-[#1A3C34]/20">
                                    {itemSaving ? 'Saving...' : 'Finalize Item'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPinned, Store, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { Logo } from '@/components/ui/Logo';

export default function SetupRestaurant() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 43.2389,
    longitude: 76.8897,
  });

  const navigate = useNavigate();
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapLoadingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let script: HTMLScriptElement | null = null;
    let removeLoadListener: (() => void) | null = null;
    const existingScript = document.querySelector('script[src*="maps.api.2gis.ru/2.0/loader.js"]');

    const destroyMap = () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn('Map cleanup error:', error);
        }
      }
      mapRef.current = null;
      markerRef.current = null;
      mapLoadingRef.current = false;
    };

    const initMap = async () => {
      // @ts-expect-error 2GIS map loader attaches DG to window
      if (!window.DG || cancelled || mapRef.current || mapLoadingRef.current) return;

      const container = mapContainerRef.current;
      if (!container) return;

      mapLoadingRef.current = true;

      try {
        // @ts-expect-error 2GIS map loader provides DG.then(...)
        await new Promise<void>((resolve) => window.DG.then(resolve));

        if (cancelled || mapRef.current) return;

        // @ts-expect-error 2GIS map SDK types are not bundled
        const map = window.DG.map(container, {
          center: [formData.latitude, formData.longitude],
          zoom: 13,
        });
        mapRef.current = map;

        // Add initial marker if needed
        // @ts-expect-error 2GIS marker
        markerRef.current = window.DG.marker([formData.latitude, formData.longitude]).addTo(map);

        map.on('click', (event: any) => {
          const { lat, lng } = event.latlng;
          setFormData((current) => ({ ...current, latitude: lat, longitude: lng }));

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            // @ts-expect-error 2GIS map SDK types are not bundled
            markerRef.current = window.DG.marker([lat, lng]).addTo(map);
          }
        });
      } catch (error) {
        console.error('Failed to initialize 2GIS map', error);
        destroyMap();
      } finally {
        mapLoadingRef.current = false;
      }
    };

    const handleLoad = () => {
      void initMap();
    };

    if (!existingScript) {
      script = document.createElement('script');
      script.src = 'https://maps.api.2gis.ru/2.0/loader.js?pkg=full';
      script.async = true;
      script.addEventListener('load', handleLoad);
      document.head.appendChild(script);
    } else {
      // @ts-expect-error window.DG
      if (window.DG) {
        void initMap();
      } else {
        existingScript.addEventListener('load', handleLoad);
        removeLoadListener = () => existingScript.removeEventListener('load', handleLoad);
      }
    }

    return () => {
      cancelled = true;
      destroyMap();

      if (script) {
        script.removeEventListener('load', handleLoad);
      }

      if (removeLoadListener) {
        removeLoadListener();
      }
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post('/restaurants/', {
        ...formData,
        is_active: true,
      });
      toast.success('Заведение успешно создано');
      navigate('/app/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка при создании');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] font-inter text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-[0.88fr_1.12fr]">
        <section className="hidden border-r border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7ff_100%)] px-10 py-12 lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <Logo className="h-9" />
            </Link>

            <div className="mt-20 max-w-xl">
              <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#1d4ed8]">
                Регистрация заведения
              </div>
              <h1 className="mt-8 text-5xl font-black leading-[1.02] tracking-tight text-slate-900">
                Настройте ресторан перед первым рабочим днём
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-slate-600">
                Укажите основную информацию и точку на карте. После этого команда сразу сможет перейти к столам и бронированиям.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <InfoCard
              icon={<Building2 size={20} />}
              title="Базовая настройка"
              description="Название, адрес и геолокация нужны для корректного отображения ресторана и публичного бронирования."
            />
            <InfoCard
              icon={<MapPinned size={20} />}
              title="Точная точка на карте"
              description="Выберите координаты кликом по карте. Это поможет гостям и команде работать с одной привязкой."
            />
          </div>
        </section>

        <section className="grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[520px] rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)] sm:p-10">
              <div className="max-w-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Шаг 1</div>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900 leading-none">Данные заведения</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600 font-medium">
                  Заполните основную информацию. После сохранения вы сможете продолжить настройку уже внутри CRM.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-10 space-y-6">
                <Field
                  label="Название заведения"
                  placeholder="Например, Kezdes Grill"
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  icon={<Store size={18} />}
                />

                <Field
                  label="Физический адрес"
                  placeholder="Улица, дом, город"
                  value={formData.address}
                  onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))}
                  icon={<MapPinned size={18} />}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <ReadonlyField label="Широта" value={formData.latitude.toFixed(6)} />
                  <ReadonlyField label="Долгота" value={formData.longitude.toFixed(6)} />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] text-[13px] font-black uppercase tracking-widest text-white transition hover:bg-[#1e40af] hover:shadow-lg hover:shadow-[#1d4ed8]/20 disabled:opacity-50 active:scale-[0.98]"
                >
                  <span>{loading ? 'Создание заведения...' : 'Перейти в панель'}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
          </div>

          <div className="min-h-[520px] overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="text-sm font-semibold text-slate-900">Выберите локацию ресторана</div>
                <div className="mt-1 text-sm text-slate-500">Кликните по карте, чтобы обновить координаты.</div>
              </div>
              <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#1d4ed8]">2GIS</div>
            </div>
            <div ref={mapContainerRef} id="map" className="h-[460px] w-full bg-slate-100" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  icon,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
        <input
          required
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafaf9] pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-50"
        />
      </div>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#fafaf9] px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.35)]">
      <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-[#1d4ed8]">{icon}</div>
      <div className="mt-4 text-lg font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-600">{description}</div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useKioskStore } from '@/stores/useKioskStore';

export interface NewsItem {
    id: string;
    title: string;
    link?: string;
    source: string;
    color: string;
    image?: string;
}

export interface WeatherData {
    temperature: number;
    condition: string;
    city: string;
    icon: string;
}

export const NEWS_SOURCES = [
    { id: 'g1', label: 'G1', url: 'https://g1.globo.com/rss/g1/', color: 'text-red-500' },
    { id: 'uol', label: 'UOL', url: 'http://rss.uol.com.br/feed/noticias.xml', color: 'text-amber-400' },
    { id: 'jovempan', label: 'Jovem Pan', url: 'https://jovempan.com.br/feed/', color: 'text-rose-500' },
    { id: 'cnn', label: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/', color: 'text-red-600' },
    { id: 'sbt', label: 'SBT News', url: 'https://sbtnews.sbt.com.br/rss.xml', color: 'text-sky-400' }
];

export function useKioskWidgets() {
    const { rssSources, loaded } = useKioskStore();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const lastFetchRef = useRef<number>(0);

    useEffect(() => {
        if (!loaded) return; // Aguarda a sincronia do Banco de Dados para ter a lista real de fontes.

        let mounted = true;

        const fetchNews = async () => {
            try {
                let activeSources = NEWS_SOURCES.filter(s => rssSources?.includes(s.id));
                if (activeSources.length === 0) activeSources = [NEWS_SOURCES[0]];

                const promises = activeSources.map(source =>
                    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`)
                        .then(res => res.json())
                        .then(data => ({ source, data }))
                );

                const results = await Promise.allSettled(promises);
                let allNews: NewsItem[] = [];

                results.forEach(result => {
                    if (result.status === 'fulfilled' && result.value.data.status === 'ok' && result.value.data.items) {
                        const items = result.value.data.items.slice(0, 8).map((noticia: any) => {
                            let imgUrl = noticia.enclosure?.link || noticia.thumbnail;
                            
                            // Regex Fallback: Procura a primeira tag de imagem <img> dentro do conteúdo HTML da matéria
                            if (!imgUrl) {
                                const regex = /<img[^>]+src="([^">]+)"/i;
                                const matchContent = noticia.content?.match(regex);
                                if (matchContent && matchContent[1]) imgUrl = matchContent[1];
                                else {
                                    const matchDesc = noticia.description?.match(regex);
                                    if (matchDesc && matchDesc[1]) imgUrl = matchDesc[1];
                                }
                            }

                            return {
                                id: noticia.guid || String(Math.random()),
                                title: noticia.title,
                                link: noticia.link,
                                source: result.value.source.label,
                                color: result.value.source.color,
                                image: imgUrl || undefined
                            };
                        });
                        allNews = [...allNews, ...items];
                    }
                });

                allNews.sort(() => Math.random() - 0.5);

                if (mounted && allNews.length > 0) {
                    setNews(allNews);
                } else if (mounted && allNews.length === 0) {
                    // Fallback: Se bloqueio de RSS, mantem a anterior se houver ou usa mock para não engasgar layout
                    console.warn("RSS Retornou Vazio. Rate limit atingido?");
                    setNews((prev) => prev.length > 0 ? prev : [{
                        id: 'mock-1',
                        title: 'Atualizando Central de Notícias... Aguarde nova conexão com os servidores.',
                        source: 'Sistema',
                        color: 'text-slate-400'
                    }]);
                }
            } catch (erro) {
                console.error("Erro ao carregar os RSS das Notificações:", erro);
                if (mounted) {
                    setNews((prev) => prev.length > 0 ? prev : [{
                        id: 'mock-error',
                        title: 'Conexão com serviço de Notícias offline ou bloqueada.',
                        source: 'Sistema',
                        color: 'text-red-500'
                    }]);
                }
            }
        };

        const fetchWeather = async () => {
            try {
                const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
                const ipData = await ipRes.json();
                const lat = ipData.latitude || -23.55;
                const lon = ipData.longitude || -46.63;
                const city = ipData.city || 'São Paulo';

                const raw = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const weatherData = await raw.json();

                if (mounted && weatherData.current_weather) {
                    const code = weatherData.current_weather.weathercode;
                    let cond = 'Ensolarado';
                    let icon = '☀️';

                    if (code >= 1 && code <= 3) { cond = 'Nublado'; icon = '🌤️'; }
                    else if (code >= 45 && code <= 48) { cond = 'Neblina'; icon = '🌫️'; }
                    else if (code >= 51 && code <= 67) { cond = 'Chuva'; icon = '🌧️'; }
                    else if (code >= 71 && code <= 77) { cond = 'Neve'; icon = '❄️'; }
                    else if (code >= 80 && code <= 82) { cond = 'Pancadas'; icon = '🌦️'; }
                    else if (code >= 95) { cond = 'Tempestade'; icon = '⛈️'; }

                    setWeather({
                        temperature: Math.round(weatherData.current_weather.temperature),
                        condition: cond,
                        city: city,
                        icon
                    });
                }
            } catch (err) {
                console.error("Weather fetch error:", err);
            }
        };

        const now = Date.now();
        // Previne multi-fetches seguidos (throttle) em hot reloads do React
        if (now - lastFetchRef.current > 10000) {
            fetchNews();
            fetchWeather();
            lastFetchRef.current = now;
        }

        // Refresh news a cada 1 hora e clima a cada 30 min.
        const iNews = setInterval(fetchNews, 60 * 60 * 1000);
        const iWeather = setInterval(fetchWeather, 30 * 60 * 1000);

        return () => {
            mounted = false;
            clearInterval(iNews);
            clearInterval(iWeather);
        };
    }, [loaded, JSON.stringify(rssSources)]);

    return { news, weather };
}

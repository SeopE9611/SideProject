import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, SearchX } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function SearchPreview({ placeholder = '상품 검색...', className = '' }: { placeholder?: string; className?: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?preview=1&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setIsOpen(true);
      } catch (e) {
        console.error('검색 오류', e);
      }
    }, 300);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* 입력창 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-500 dark:text-cyan-300" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length >= 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="
        w-full pl-12 rounded-2xl
        border border-cyan-300 dark:border-cyan-700
        bg-white dark:bg-[#1a2230] shadow-md
        text-gray-900 dark:text-white
        placeholder:text-gray-400 dark:placeholder:text-gray-500
        focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400
        transition-colors
      "
        />
      </div>

      {/* 결과창 */}
      {isOpen && query.trim() && (
        <div
          className="
        absolute z-50 mt-2 w-full
        bg-white dark:bg-[#222e3a]
        border border-gray-100 dark:border-gray-700
        shadow-lg rounded-2xl max-h-80 overflow-y-auto
        transition-all
      "
        >
          {results.length > 0 ? (
            results.map((item) => (
              <Link
                key={item._id}
                href={`/products/${item._id}`}
                className="
              flex items-center gap-4 px-4 py-3
              hover:bg-cyan-50 dark:hover:bg-cyan-900/30
              transition-all group
            "
                onClick={() => setIsOpen(false)}
              >
                {item.image ? <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-xl shadow group-hover:ring-2 group-hover:ring-cyan-400/60" /> : <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-xl" />}
                <div>
                  <div className="text-base font-semibold text-gray-800 dark:text-white group-hover:text-cyan-500">{item.name}</div>
                  <div className="text-xs text-cyan-600 dark:text-cyan-300">{item.price.toLocaleString()}원</div>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-7 px-4 text-gray-400 dark:text-gray-300 text-base min-h-[120px]">
              <SearchX className="w-10 h-10 text-cyan-400 dark:text-cyan-300 mb-2" />
              <div>
                <span className="font-semibold text-cyan-600 dark:text-cyan-300">“{query}”</span>
                <span>에 대한 검색 결과가 없습니다.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, SearchX } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function SearchPreview({ placeholder = '상품 검색...', className = '', onSelect }: { placeholder?: string; className?: string; onSelect?: () => void }) {
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
 // 통합 검색 API (스트링 + 중고 라켓)
 const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
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
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
 border border-border
 bg-card shadow-md
 text-foreground 
 placeholder:text-muted-foreground dark:placeholder:text-muted-foreground
 focus:ring-2 focus:ring-ring focus:border-border
 transition-colors
 "
 />
 </div>

 {/* 결과창 */}
 {isOpen && query.trim() && (
 <div
 className="
 absolute z-50 mt-2 w-full
 bg-card
 border border-border
 shadow-lg rounded-2xl max-h-80 overflow-y-auto
 transition-all
 "
 >
 {results.length > 0 ? (
 results.map((item) => {
 // type 에 따라 이동 경로 분기
 const href = item.type === 'racket' ? `/rackets/${item._id}` : `/products/${item._id}`;

 return (
 <Link
 key={item._id}
 href={href}
 className="
 flex items-center gap-4 px-4 py-3
 hover:bg-accent/50
 transition-all group
 "
 onClick={() => {
 setIsOpen(false);
 onSelect?.(); // 바깥(=Header Sheet)에게 "선택됨" 알림
 }}
 >
 {item.image ? <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-xl shadow" /> : <div className="w-14 h-14 bg-muted rounded-xl" />}

 <div className="flex flex-col gap-1">
 <div className="text-base font-semibold text-foreground group-hover:text-accent">{item.name}</div>
 <div className="flex items-center gap-2 text-xs text-muted-foreground ">
 {/* 타입 뱃지: 라켓 / 스트링 구분 */}
 <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground">{item.type === 'racket' ? '중고 라켓' : '스트링'}</span>
 {typeof item.price === 'number' && item.price > 0 && <span className="text-accent">{item.price.toLocaleString()}원</span>}
 </div>
 </div>
 </Link>
 );
 })
 ) : (
 <div className="flex flex-col items-center justify-center py-7 px-4 text-muted-foreground text-base min-h-[120px]">
 <SearchX className="w-10 h-10 text-muted-foreground mb-2" />
 <div>
 <span className="font-semibold text-accent">“{query}”</span>
 <span>에 대한 검색 결과가 없습니다.</span>
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 );
}

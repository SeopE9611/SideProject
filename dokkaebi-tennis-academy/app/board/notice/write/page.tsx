'use client';

import type React from 'react';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Bell, Upload, X, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export default function NoticeWritePage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [category, setCategory] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 5) {
      alert('최대 5개까지만 첨부할 수 있습니다.');
      return;
    }
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild className="p-2">
              <Link href="/board/notice">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 shadow-lg">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">공지사항 작성</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">중요한 소식을 회원들에게 전달하세요</p>
              </div>
            </div>
          </div>

          <Card className="border-0 bg-white/80 dark:bg-gray-800/80 shadow-xl backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/50 dark:to-teal-950/50 border-b">
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <span>새 공지사항 작성</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <Label htmlFor="category" className="text-base font-semibold">
                  카테고리 <span className="text-red-500">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="h-12 bg-white dark:bg-gray-700">
                    <SelectValue placeholder="공지사항 카테고리를 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          일반
                        </Badge>
                        <span>일반적인 공지사항</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="event">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          이벤트
                        </Badge>
                        <span>할인, 프로모션 등 이벤트</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="academy">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          아카데미
                        </Badge>
                        <span>레슨, 프로그램 관련</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="maintenance">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          점검
                        </Badge>
                        <span>시스템 점검, 휴무 안내</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          긴급
                        </Badge>
                        <span>긴급 공지사항</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="title" className="text-base font-semibold">
                  제목 <span className="text-red-500">*</span>
                </Label>
                <Input id="title" placeholder="공지사항 제목을 입력해주세요" className="h-12 bg-white dark:bg-gray-700 text-base" />
              </div>

              <div className="space-y-3">
                <Label htmlFor="content" className="text-base font-semibold">
                  내용 <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="content"
                  placeholder="공지사항 내용을 작성해주세요.&#10;&#10;• 명확하고 이해하기 쉽게 작성해주세요&#10;• 중요한 내용은 굵게 표시하거나 별도로 강조해주세요&#10;• 문의사항이 있을 경우 연락처를 포함해주세요"
                  className="min-h-[300px] bg-white dark:bg-gray-700 text-base resize-none"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="image" className="text-base font-semibold">
                  첨부파일 (선택사항)
                </Label>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">이미지나 문서를 첨부하세요</p>
                    <Input id="image" type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                    <Button type="button" variant="outline" onClick={() => document.getElementById('image')?.click()} className="mt-2">
                      <Upload className="h-4 w-4 mr-2" />
                      파일 선택
                    </Button>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">첨부된 파일 ({selectedFiles.length}/5)</p>
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded flex items-center justify-center">
                                <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    • 최대 5개까지 첨부 가능 (파일당 최대 10MB)
                    <br />• 지원 형식: JPG, PNG, GIF, PDF, DOC, DOCX
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Checkbox id="pinned" checked={isPinned} onCheckedChange={(checked) => setIsPinned(checked as boolean)} className="mt-1" />
                <div className="space-y-1">
                  <label htmlFor="pinned" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center">
                    <Pin className="h-4 w-4 mr-1 text-blue-600" />
                    상단 고정
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">중요한 공지사항을 게시판 상단에 고정하여 표시합니다.</p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between p-8 border-t bg-gray-50/50 dark:bg-gray-700/20">
              <Button variant="outline" asChild size="lg" className="px-8 bg-transparent">
                <Link href="/board/notice">취소</Link>
              </Button>
              <div className="flex space-x-3">
                <Button variant="outline" size="lg" className="px-6 border-blue-200 text-blue-700 hover:bg-blue-50 bg-transparent">
                  임시저장
                </Button>
                <Button size="lg" className="px-8 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700">
                  공지사항 등록
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

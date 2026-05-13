import { NextResponse } from 'next/server';

const NAVER_BLOG_URL =
  'https://m.cafe.naver.com/ca-fe/web/cafes/23754196/articles/137109?menuId=271&art=aW50ZXJuYWwtY2FmZS1hcnRpY2xlLXJlYWQtaW5DYWZlLXNlYXJjaC1saXN0.eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjYWZlVHlwZSI6IkNBRkVfSUQiLCJhcnRpY2xlSWQiOjEzNzEwOSwiaXNzdWVkQXQiOjE3Nzg2NzM3NDc2MTYsImNhZmVJZCI6MjM3NTQxOTZ9.E3fGh6NnWOuoYsrK8txF7_ZGtaqZBNyG0cdw53H6xxM&query=%EB%8C%80%EC%84%B8%ED%95%99%EC%9B%90&tc=cafe_search_result';

export function GET() {
  return NextResponse.redirect(NAVER_BLOG_URL, 307);
}

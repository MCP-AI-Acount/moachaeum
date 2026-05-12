#!/bin/bash
# 기존 추적 정보를 초기화하고 새로 스캔하도록 수정
git rm -r --cached . 
git add .
git commit -m "Update: $(date +'%Y-%m-%d %H:%M:%S')"
git push -f origin main
echo "✅ 배포가 완료되었습니다!"
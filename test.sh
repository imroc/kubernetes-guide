pullResult=`git pull 2>&1`
isLatest=`echo $pullResult | grep 'Already up to date'`
if [ "$isLatest" ]; then
  echo "no new commit"
  exit 0
fi
echo "new commit detected, start task to rebuild book"

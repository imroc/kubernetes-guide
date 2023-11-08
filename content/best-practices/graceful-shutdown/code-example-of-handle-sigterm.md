# 业务代码处理 SIGTERM 信号

要实现优雅终止，首先业务代码得支持下优雅终止的逻辑，在业务代码里面处理下 `SIGTERM` 信号，一般主要逻辑就是"排水"，即等待存量的任务或连接完全结束，再退出进程。

本文给出各种语言的代码示例。

<Tabs>
  <TabItem value="shell" label="shell">
    <FileBlock showLineNumbers file="handle-sigterm/sigterm.sh" />
  </TabItem>

  <TabItem value="python" label="Python">
    <FileBlock showLineNumbers file="handle-sigterm/sigterm.py" />
  </TabItem>

  <TabItem value="js" label="NodeJS">
    <FileBlock showLineNumbers file="handle-sigterm/sigterm.js" />
  </TabItem>

  <TabItem value="java" label="Java">
    <FileBlock showLineNumbers file="handle-sigterm/sigterm.java" />
  </TabItem>
</Tabs>

import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  troubleshootingSidebar: [
    'README',
    {
      type: 'category',
      label: '运行时排障',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/cases/runtime'
      },
      items: [
        'runtime/io-high-load-causing-pod-creation-timeout',
        'runtime/pull-image-fail-in-high-version-containerd',
        'runtime/mount-root-causing-device-or-resource-busy',
        'runtime/broken-system-time-causing-sandbox-conflicts',
      ],
    },
    {
      type: 'category',
      label: '网络排障',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/cases/network'
      },
      items: [
        'network/dns-lookup-5s-delay',
        'network/arp-cache-overflow-causing-healthcheck-failed',
        'network/cross-vpc-connect-nodeport-timeout',
        'network/musl-libc-dns-id-conflict-causing-dns-abnormal',
      ],
    },
    {
      type: 'category',
      label: '高负载',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/cases/high-load'
      },
      items: [
        'high-load/disk-full-causing-high-cpu',
      ],
    },
    {
      type: 'category',
      label: '集群故障',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/cases/cluster'
      },
      items: [
        'cluster/delete-rancher-ns-causing-node-disappear',
        'cluster/scheduler-snapshot-missing-causing-pod-pending',
        'cluster/kubectl-exec-or-logs-failed',
      ],
    },
    {
      type: 'category',
      label: '节点排障',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/cases/node'
      },
      items: [
        'node/cgroup-leaking',
      ],
    },
    {
      type: 'category',
      label: '其它排障',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/cases/others'
      },
      items: [
        'others/failed-to-modify-hosts-in-multiple-container',
        'others/job-cannot-delete',
        'others/dotnet-configuration-cannot-auto-reload',
      ],
    },
  ],
};

export default sidebars;

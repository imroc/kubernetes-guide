import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  troubleshootingSidebar: [
    'README',
    {
      type: 'category',
      label: '排障技能',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/skill'
      },
      items: [
        'skill/linux',
        'skill/enter-netns-with-nsenter',
        'skill/remote-capture-with-ksniff',
        'skill/use-systemtap-to-locate-problems',
        'skill/tcpdump',
        'skill/wireshark',
      ],
    },
    {
      type: 'category',
      label: 'Pod 排障',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/pod'
      },
      items: [
        'pod/healthcheck-failed',
        'pod/device-or-resource-busy',
        {
          type: 'category',
          label: 'Pod 状态异常',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/pod/status'
          },
          items: [
            'pod/status/intro',
            'pod/status/pod-terminating',
            'pod/status/pod-pending',
            'pod/status/pod-containercreating-or-waiting',
            'pod/status/pod-crash',
            'pod/status/pod-imagepullbackoff',
          ],
        }
      ],
    },
    {
      type: 'category',
      label: '节点排障',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/node'
      },
      items: [
        'node/node-crash-and-vmcore',
        'node/node-high-load',
        'node/io-high-load',
        'node/memory-fragmentation',
        'node/disk-full',
        'node/pid-full',
        'node/arp-cache-overflow',
        'node/runnig-out-of-inotify-watches',
        'node/kernel-solft-lockup',
        'node/no-space-left-on-device',
        'node/ipvs-no-destination-available',
        'node/cadvisor-no-data',
      ],
    },
    {
      type: 'category',
      label: '网络排障',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/network'
      },
      items: [
        'network/timeout',
        'network/packet-loss',
        'network/network-unreachable',
        'network/slow-network-traffic',
        'network/dns-exception',
        'network/close-wait-stacking',
        'network/traffic-surge',
      ],
    },
    {
      type: 'category',
      label: '存储排障',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/storage'
      },
      items: [
        'storage/unable-to-mount-volumes',
        'storage/setup-failed-for-volume',
      ],
    },
    {
      type: 'category',
      label: '集群排障',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/cluster'
      },
      items: [
        'cluster/namespace-terminating',
      ],
    },
    "sdk",
    {
      type: 'category',
      label: '排障案例',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/cases'
      },
      items: [
        {
          type: 'category',
          label: '运行时排障',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/cases/runtime'
          },
          items: [
            'cases/runtime/io-high-load-causing-pod-creation-timeout',
            'cases/runtime/pull-image-fail-in-high-version-containerd',
            'cases/runtime/mount-root-causing-device-or-resource-busy',
            'cases/runtime/broken-system-time-causing-sandbox-conflicts',
          ],
        },
        {
          type: 'category',
          label: '网络排障',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/cases/network'
          },
          items: [
            'cases/network/dns-lookup-5s-delay',
            'cases/network/arp-cache-overflow-causing-healthcheck-failed',
            'cases/network/cross-vpc-connect-nodeport-timeout',
            'cases/network/musl-libc-dns-id-conflict-causing-dns-abnormal',
          ],
        },
        {
          type: 'category',
          label: '高负载',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/cases/high-load'
          },
          items: [
            'cases/high-load/disk-full-causing-high-cpu',
          ],
        },
        {
          type: 'category',
          label: '集群故障',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/cases/cluster'
          },
          items: [
            'cases/cluster/delete-rancher-ns-causing-node-disappear',
            'cases/cluster/scheduler-snapshot-missing-causing-pod-pending',
            'cases/cluster/kubectl-exec-or-logs-failed',
          ],
        },
        {
          type: 'category',
          label: '节点排障',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/cases/node'
          },
          items: [
            'cases/node/cgroup-leaking',
          ],
        },
        {
          type: 'category',
          label: '其它排障',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/cases/others'
          },
          items: [
            'cases/others/failed-to-modify-hosts-in-multiple-container',
            'cases/others/job-cannot-delete',
            'cases/others/dotnet-configuration-cannot-auto-reload',
          ],
        },
      ],
    }
  ],
};

export default sidebars;

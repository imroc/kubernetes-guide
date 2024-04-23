import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  bestPracticesSidebar: [
    'README',
    {
      type: 'category',
      label: '优雅终止',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/graceful-shutdown'
      },
      items: [
        'graceful-shutdown/intro',
        'graceful-shutdown/pod-termination-proccess',
        'graceful-shutdown/sigterm',
        'graceful-shutdown/prestop',
        'graceful-shutdown/update-strategy',
        'graceful-shutdown/long-connection',
        'graceful-shutdown/lb-to-pod-directly',
      ],
    },
    {
      type: 'category',
      label: 'DNS',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/dns'
      },
      items: [
        'dns/customize-dns-resolution',
        'dns/optimize-coredns-performance',
      ],
    },
    {
      type: 'category',
      label: '性能优化',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/performance-optimization'
      },
      items: [
        'performance-optimization/network',
        'performance-optimization/cpu',
      ],
    },
    {
      type: 'category',
      label: '高可用',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/ha'
      },
      items: [
        'ha/pod-split-up-scheduling',
        'ha/smooth-upgrade',
      ],
    },
    {
      type: 'category',
      label: '弹性伸缩',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/autoscaling'
      },
      items: [
        'autoscaling/hpa-velocity',
        'autoscaling/hpa-with-custom-metrics',
        {
          type: 'category',
          label: '事件驱动弹性伸缩(KEDA)',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/autoscaling/keda'
          },
          items: [
            'autoscaling/keda/overview',
            'autoscaling/keda/install',
            'autoscaling/keda/cron',
            'autoscaling/keda/workload',
          ]
        }
      ],
    },
    {
      type: 'category',
      label: '容器化',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/containerization'
      },
      items: [
        'containerization/thin-image',
        'containerization/systemd',
        'containerization/java',
        'containerization/golang',
        'containerization/crontab',
        'containerization/timezone',
        'containerization/logrotate',
      ],
    },
    {
      type: 'category',
      label: '集群运维',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/ops'
      },
      items: [
        'ops/securely-maintain-or-offline-node',
        'ops/securely-modify-container-root-dir',
        'ops/large-scale-cluster-optimization',
        'ops/etcd-optimization',
        'ops/batch-operate-node-with-ansible',
      ],
    },
    'configure-healthcheck',
    'request-limit',
    'logging',
    'long-connection',
  ],
};

export default sidebars;

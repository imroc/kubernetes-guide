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
        'graceful-shutdown/code-example-of-handle-sigterm',
        'graceful-shutdown/why-cannot-receive-sigterm',
        'graceful-shutdown/propagating-signals-in-shell',
        'graceful-shutdown/use-prestop',
        'graceful-shutdown/persistent-connection',
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
        'containerization/systemd-in-container',
        'containerization/java',
        'containerization/golang',
        'containerization/crontab-in-container',
        'containerization/timezone',
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

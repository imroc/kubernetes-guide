import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  appendixSidebar: [
    'README',
    'kubectl-cheat-sheet',
    {
      type: 'category',
      label: '实用 YAML',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/yaml'
      },
      items: [
        'yaml/test',
        'yaml/rbac',
      ]
    },
    {
      type: 'category',
      label: 'Terrafrom 配置',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/terraform'
      },
      items: [
        'terraform/tke-vpc-cni',
        'terraform/tke-serverless',
      ]
    },
  ],
};

export default sidebars;

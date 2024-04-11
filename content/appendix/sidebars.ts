import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  appendixSidebar: [
    'README',
    {
      type: 'category',
      label: 'kubectl 速查手册',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/kubectl'
      },
      items: [
        'get-raw',
        'node',
        'pod',
      ]
    },
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

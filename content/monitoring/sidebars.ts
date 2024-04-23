import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  appendixSidebar: [
    'README',
    {
      type: 'category',
      label: 'Prometheus',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/prometheus'
      },
      items: [
        'prometheus/annotation-discovery',
      ],
    },
    {
      type: 'category',
      label: 'Grafana',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/grafana'
      },
      items: [
        'grafana/ha',
      ],
    },
    {
      type: 'category',
      label: 'Victoria Metrics',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/victoriametrics'
      },
      items: [
        'victoriametrics/install-with-operator',
      ],
    }
  ],
};

export default sidebars;

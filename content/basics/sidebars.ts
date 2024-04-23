import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  basicsSidebar: [
    'README',
    {
      type: 'category',
      label: '集群搭建',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/deploy'
      },
      items: [
        {
          type: 'category',
          label: '使用 kubespray 搭建集群',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/deploy/kubespray'
          },
          items: [
            'deploy/kubespray/install',
            'deploy/kubespray/offline',
          ],
        },
        {
          type: 'category',
          label: '安装 k3s 轻量集群',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/deploy/k3s'
          },
          items: [
            'deploy/k3s/install-cases',
            'deploy/k3s/offline-installation',
          ],
        },
        'deploy/terraform',
        {
          type: 'category',
          label: '在 AWS 上创建集群',
          collapsed: true,
          link: {
            type: 'generated-index',
            slug: '/deploy/aws'
          },
          items: [
            'deploy/aws/eks',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: '高效使用 kubectl',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/kubectl'
      },
      items: [
        'kubectl/kubectl-aliases',
        'kubectl/quick-switch-with-kubectx',
        'kubectl/merge-kubeconfig-with-kubecm',
      ],
    },
    {
      type: 'category',
      label: '镜像相关实践',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/images'
      },
      items: [
        'images/podman',
        'images/sync-images-with-skopeo',
      ],
    },
    {
      type: 'category',
      label: '应用部署',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/apps'
      },
      items: [
        'apps/set-sysctl',
      ],
    },
    {
      type: 'category',
      label: '证书签发',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/certs'
      },
      items: [
        'certs/sign-certs-with-cfssl',
        'certs/sign-free-certs-with-cert-manager',
        'certs/sign-free-certs-for-dnspod',
      ],
    },
    {
      type: 'category',
      label: '用户与权限',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/rbac'
      },
      items: [
        'rbac/create-user-using-csr-api',
      ],
    },
    {
      type: 'category',
      label: '常见问题',
      collapsed: false,
      link: {
        type: 'generated-index',
        slug: '/faq'
      },
      items: [
        'faq/why-enable-bridge-nf-call-iptables',
        'faq/ipvs-conn-reuse-mode',
      ],
    },
  ],
};

export default sidebars;

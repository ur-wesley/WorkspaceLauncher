interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: '📦',
    title: 'Workspace Management',
    description: 'Organize all your environments and workflows in one place. Create custom workspaces for any scenario—development, gaming, productivity, and more.',
  },
  {
    icon: '⚡',
    title: 'One-Click Launch',
    description: 'Execute multiple actions simultaneously. Launch apps, connect to servers, open URLs, run commands—all with a single click.',
  },
  {
    icon: '🔧',
    title: 'Tool Templates',
    description: 'Create reusable configurations with placeholders and variables. Share settings across workspaces or with your team.',
  },
  {
    icon: '📊',
    title: 'Process Tracking',
    description: 'Monitor running processes in real-time. View execution history and track what\'s currently active.',
  },
  {
    icon: '🔄',
    title: 'Import & Export',
    description: 'Share your workspace configurations via JSON files or clipboard. Collaborate and sync across devices.',
  },
  {
    icon: '🎨',
    title: 'Customizable Themes',
    description: 'Personalize your interface with custom themes. Choose from light mode, dark mode, or create your own.',
  },
];

const Features = () => {
  return (
    <section id="features" class="py-32 bg-gray-800">
      <div class="section-container">
        <div class="text-center mb-20">
          <h2 class="text-4xl md:text-5xl font-bold text-white mb-4">
            Powerful Features
          </h2>
          <p class="text-xl text-gray-400 max-w-2xl mx-auto">
            Everything you need to streamline your daily workflows
          </p>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div class="bg-gray-900/50 border border-gray-700 rounded-xl p-8 hover:border-primary-500 transition-all hover:shadow-xl hover:shadow-primary-500/10">
              <div class="text-4xl mb-4">{feature.icon}</div>
              <h3 class="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p class="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

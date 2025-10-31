const technologies = [
  { name: 'SolidJS', color: 'bg-blue-500' },
  { name: 'Tauri', color: 'bg-blue-600' },
  { name: 'TypeScript', color: 'bg-blue-400' },
  { name: 'SQLite', color: 'bg-blue-700' },
  { name: 'UnoCSS', color: 'bg-blue-500' },
  { name: 'Bun', color: 'bg-yellow-500' },
];

const TechStack = () => {
  return (
    <section class="py-32 bg-gradient-to-b from-gray-900 to-gray-800">
      <div class="section-container">
        <div class="text-center mb-20">
          <h2 class="text-4xl md:text-5xl font-bold text-white mb-4">
            Built with Modern Tech
          </h2>
          <p class="text-xl text-gray-400 max-w-2xl mx-auto">
            Leveraging cutting-edge technologies for performance and reliability
          </p>
        </div>
        <div class="flex flex-wrap justify-center gap-4">
          {technologies.map((tech) => (
            <div class={`${tech.color} px-6 py-3 rounded-lg text-white font-semibold shadow-lg`}>
              {tech.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStack;

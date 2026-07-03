# platform

Lifecycle e capacidades específicas da plataforma. `pwa/` mantém configuração de base/build, registro do service worker e o coordinator de update. O coordinator recebe atividade da run por `setRunActive`; F1 deve ligar seu lifecycle real a esse port. Viewport e storage permanecem para specs posteriores.

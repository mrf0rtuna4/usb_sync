const fs = require('fs');
const path = require('path');
const readline = require('readline');
const ProgressBar = require('progress');
const { createSettings } = require('./settings');

function copyFolderRecursiveSync(source, target, progressBar) {
  const files = fs.readdirSync(source);

  if (!fs.existsSync(target)) {
    fs.mkdirSync(target);
  }

  files.forEach(function (file) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    const stat = fs.statSync(sourcePath);

    if (stat.isFile()) {
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
      }
      progressBar.tick(stat.size);
    } else if (stat.isDirectory()) {
      copyFolderRecursiveSync(sourcePath, targetPath, progressBar);
    }
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function syncFolders(computerFolderPath, flashDriveFolderPath) {
  try {
    const totalSize = getTotalSize(computerFolderPath);
    const progressBar = new ProgressBar('  Загрузка [:bar] :percent :etas', {
      complete: '=',
      incomplete: ' ',
      width: 30,
      total: totalSize
    });

    copyFolderRecursiveSync(computerFolderPath, flashDriveFolderPath, progressBar);
    console.log('Синхронизация завершена успешно.');
  } catch (err) {
    console.error('Ошибка при синхронизации:', err);
  }
}

function getTotalSize(folderPath) {
  let totalSize = 0;
  const files = fs.readdirSync(folderPath);

  files.forEach(function (file) {
    const filePath = path.join(folderPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      totalSize += stat.size;
    } else if (stat.isDirectory()) {
      totalSize += getTotalSize(filePath);
    }
  });

  return totalSize;
}

function chooseMode() {
  console.log('Выберите режим:');
  console.log('1. С таймером');
  console.log('2. С выбором папки в консоли');
  console.log('3. Обычный режим');

  rl.question('Введите номер режима: ', (mode) => {
    rl.close();

    switch (mode) {
      case '1':
        const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
        const computerFolderPath = config.computerFolderPath;
        const flashDriveFolderPath = config.flashDriveFolderPath;
        const syncIntervalMinutes = config.syncIntervalMinutes || 60;

        setInterval(() => {
          syncFolders(computerFolderPath, flashDriveFolderPath);
        }, syncIntervalMinutes * 60 * 1000);

        console.log('Синхронизация будет выполняться каждые', syncIntervalMinutes, 'минут.');
        break;

      case '2':
        rl.question('Введите путь к папке на компьютере: ', (computerFolderPath) => {
          rl.question('Введите путь к папке на флешке: ', (flashDriveFolderPath) => {
            rl.close();
            syncFolders(computerFolderPath, flashDriveFolderPath);
          });
        });
        break;

      case '3':
        const configPath = 'config.json';
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          const computerFolderPath = config.computerFolderPath;
          const flashDriveFolderPath = config.flashDriveFolderPath;

          syncFolders(computerFolderPath, flashDriveFolderPath);
        } else {
          console.error('Файл конфигурации не найден.');
        }
        break;

      default:
        console.error('Неверный номер режима.');
        break;
    }
  });
}

const args = process.argv.slice(2);

if (args.length === 3) {
  const computerFolderPath = args[0];
  const flashDriveFolderPath = args[1];
  const syncIntervalMinutes = args[2];
  const { createSettings } = require('./settings');
  createSettings(computerFolderPath, flashDriveFolderPath, syncIntervalMinutes);

  rl.question('Нажмите Enter, чтобы завершить программу...', () => {
    rl.close();
  });
} else {
  chooseMode();
}


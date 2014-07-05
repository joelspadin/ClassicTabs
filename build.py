from glob2 import glob
from operator import itemgetter
import json
import os
import re
import shutil
import sys
import subprocess
import time
import traceback

BUILD_DIR = 'build'
DEFAULT_NAME = 'EXTENSION_NAME'
PRIVATE_KEY = '../[Keys]/ClassicTabs.pem'

INCLUDES = [
    '_locales/**/messages.json',
    'css/**/*.css',
    'img/**/*.gif',
    'img/**/*.jpg',
    'img/**/*.png',
    'img/**/*.svg',
    'js/**/*.js',
    '**/*LICENSE',
    'manifest.json',
    'LICENSE',
    'README.md',
    'options-page.html',
]

IGNORE_TYPES = [
    '.min.css',
    '.min.js',
]

def build_package():
    """ Copies all the included files to the build directory """
    # Erase and rebuild the build directory
    if os.path.exists(BUILD_DIR):
        shutil.rmtree(BUILD_DIR)

    mkdir(BUILD_DIR)

    for include in INCLUDES:
        # Glob all the files!
        files = glob(include)
        for file in files:
            # Filter out ignored file types
            if split_compound_ext(file)[1].lower() in IGNORE_TYPES:
                continue

            # Copy the file
            newfile = os.path.join(BUILD_DIR, file)
            newdir = os.path.dirname(newfile)

            if not os.path.exists(newdir):
                mkdir(newdir)

            shutil.copy(file, newfile)

def find_build_executable():
    executable = None
    if sys.platform == 'win32':
        # Opera ignores --pack-extension, so I'll just use Chrome instead.
        import winreg
        try:
            CHROME_KEY = r"Software\Clients\StartMenuInternet\Google Chrome\shell\open\command"
            executable = winreg.QueryValue(winreg.HKEY_LOCAL_MACHINE, CHROME_KEY).strip('"')
        except WindowsError:
            pass
    else:
        raise NotImplementedError()

    return executable

def fix_manifest():
    """ Removes testing info from the manifest file """
    manifest = ''
    resource_pattern = r',[^"}]+("web_accessible_resources"\s*:\s*\[\s*((".+"\s*,\s*)*(".+")?)\s*\])'

    with open('build/manifest.json', 'r', encoding='utf-8-sig') as file:
        manifest = file.read()
        manifest = re.sub(resource_pattern, fix_resources, manifest)

    with open('build/manifest.json', 'w', encoding='utf-8-sig') as file:
        file.write(manifest)

def fix_resources(match):
    """ Regex replace routing that filters out files not in the build directory """
    files = [ file.strip().strip('"') for file in match.group(2).split(',') ]

    # Keep only the files that exist
    files = [ file for file in files if os.path.exists(os.path.join(BUILD_DIR, file)) ]

    if len(files) == 0:
        return ''
    else:
        filestring = ', '.join([ '"%s"' % file for file in files ])
        return match.group(0).replace(match.group(2), filestring)

def get_extension_name():
    """ Grabs the extension name from the manifest """
    with open('manifest.json', 'r', encoding='utf-8-sig') as file:
        manifest = json.load(file)

    name = manifest['name'] if 'name' in manifest else DEFAULT_NAME

    # If the extension name is localized, grab the name from the default locale
    match = re.match(r'__MSG_(.+)__', name)
    if match:
        locale = manifest['default_locale'] if 'default_locale' in manifest else 'en_US'
        with open(os.path.join('_locales', locale, 'messages.json'), 'r', encoding='utf-8-sig') as file:
            messages = json.load(file)

        key = match.group(1)
        name = messages[key]['message'] if key in messages else DEFAULT_NAME

    return name

def package_extension(path, key):
    """ Uses Chrome to compile the build directory into an extension package """
    path = os.path.abspath(path)
    key = os.path.abspath(key)

    subprocess.check_output([find_build_executable(), '--pack-extension={0}'.format(path), '--pack-extension-key={0}'.format(key)])

def mkdir(dir, max_retries=10):
    """ Makes dir, retrying if it failed due to a permission error """
    try:
        safe_mkdir(dir)
    except PermissionError:
        if max_retries > 0:
            mkdir(dir, max_retries - 1)
        else:
            raise

def safe_mkdir(dir):
    """ Makes dir and any missing parent directories """
    if not os.path.exists(dir):
        head, tail = os.path.split(dir)
        if tail:
            safe_mkdir(head)
            os.mkdir(dir)
        elif head:
            os.mkdir(dir)

def split_compound_ext(path):
    """ splitext with support for compound extensions (ex: foo.js.map into foo, .js.map) """
    path, ext1 = os.path.splitext(path)
    path, ext2 = os.path.splitext(path)
    return path, ext2 + ext1

def main():
    # Copy all the necessary files into the build directory
    build_package()
    fix_manifest()

    # Get the desired package name and the name Chrome will give to the package
    name = get_extension_name()
    buildname = BUILD_DIR.rstrip('/').rpartition('/')[2]

    try:
        # Build the package, then rename it to the desired name
        package_extension(BUILD_DIR, PRIVATE_KEY)
        shutil.move(buildname + '.crx', '{0}.nex'.format(name))
    except subprocess.CalledProcessError as e:
        # If Chrome fails to package the extension, print its output so we know why.
        print(e.output)
        raise e

if __name__ == '__main__':
    try:
        main()
    except:
        traceback.print_exc()
        input('Press Enter...')


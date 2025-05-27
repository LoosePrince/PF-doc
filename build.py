#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
EasyDocument 文档路径生成工具
用于扫描data目录下的所有文档文件，并生成path.json文件
"""

import os
import json
import argparse
import re
import sys
import datetime
import urllib.request
import urllib.error
from pathlib import Path
from html.parser import HTMLParser
import io
import zipfile
import shutil
import tempfile
import glob

# 导入Git相关库
try:
    import git
    GIT_AVAILABLE = True
except ImportError:
    GIT_AVAILABLE = False
    print("警告: GitPython库未安装，Git相关功能将被禁用。可通过 pip install gitpython 安装。")

# 默认配置
DEFAULT_CONFIG = {
    "root_dir": "data",                                 # 文档根目录
    "default_page": "README.md",                        # 默认文档
    "index_pages": ["README.md", "README.html",         # 索引页文件名
                   "index.md", "index.html"], 
    "supported_extensions": [".md", ".html"],           # 支持的文档扩展名
    "git": {
        "enable": True,                                 # 是否启用Git相关功能
        "show_last_modified": True,                     # 显示最后修改时间
        "show_contributors": True                       # 显示贡献者
    },
    "github": {
        "enable": True,                                 # 是否启用GitHub相关功能
        "edit_link": True,                              # 显示编辑链接
        "show_avatar": False                            # 显示头像而非名称
    },
    "site": {
        "title": "",
        "description": "",
        "keywords": "",
        "base_url": ""
    },
    "appearance": {
        "favicon": "",
        "logo": "",
        "theme_color": ""
    }
}

# GitHub用户信息缓存
GITHUB_USERS_CACHE = {}
# 邮箱到GitHub用户名的映射缓存
EMAIL_TO_USERNAME_MAP = {}

# HTML解析器，用于从HTML文件中提取文本内容
class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ["script", "style"]:
            self.skip = True

    def handle_endtag(self, tag):
        if tag in ["script", "style"]:
            self.skip = False

    def handle_data(self, data):
        if not self.skip and data.strip():
            # 移除多余的换行符和空格
            cleaned_data = ' '.join(data.split())
            self.result.append(cleaned_data)

    def get_text(self):
        return " ".join(self.result)

def is_supported_file(filename, config):
    """检查文件是否为支持的文档文件"""
    ext = os.path.splitext(filename)[1].lower()
    return ext in config["supported_extensions"]

def is_index_file(filename, config):
    """检查文件是否为索引文件"""
    return filename in config["index_pages"]

def get_github_username_by_email(email, repo):
    """根据邮箱地址获取GitHub用户名"""
    if email in EMAIL_TO_USERNAME_MAP:
        return EMAIL_TO_USERNAME_MAP[email]
        
    # 尝试提取GitHub自动生成的noreply邮箱中的用户ID
    # 格式通常是：数字+用户名@users.noreply.github.com
    noreply_match = re.match(r'(\d+)\+(.+)@users\.noreply\.github\.com', email)
    if noreply_match:
        username = noreply_match.group(2)
        # 修正：如果用户名中包含'+'，只取'+'后部分
        if '+' in username:
            username = username.split('+')[-1]
        EMAIL_TO_USERNAME_MAP[email] = username
        return username
        
    # 另一种GitHub邮箱格式：用户名@users.noreply.github.com
    noreply_match2 = re.match(r'(.+)@users\.noreply\.github\.com', email)
    if noreply_match2:
        username = noreply_match2.group(1)
        # 修正：如果用户名中包含'+'，只取'+'后部分
        if '+' in username:
            username = username.split('+')[-1]
        EMAIL_TO_USERNAME_MAP[email] = username
        return username
    
    # 查找用户名关联的所有提交，尝试找到GitHub用户名
    try:
        all_commits = list(repo.iter_commits(max_count=500))
        for commit in all_commits:
            # 如果提交的邮箱与当前邮箱匹配
            if commit.author.email == email:
                # 检查是否有GitHub格式的用户名邮箱
                for other_commit in all_commits:
                    if other_commit.author.name == commit.author.name and '@users.noreply.github.com' in other_commit.author.email:
                        noreply_match = re.match(r'(\d+)\+(.+)@users\.noreply\.github\.com', other_commit.author.email)
                        if noreply_match:
                            username = noreply_match.group(2)
                            if '+' in username:
                                username = username.split('+')[-1]
                            EMAIL_TO_USERNAME_MAP[email] = username
                            return username
                        
                        noreply_match2 = re.match(r'(.+)@users.noreply.github.com', other_commit.author.email)
                        if noreply_match2:
                            username = noreply_match2.group(1)
                            if '+' in username:
                                username = username.split('+')[-1]
                            EMAIL_TO_USERNAME_MAP[email] = username
                            return username
    except Exception as e:
        print(f"查找GitHub用户名失败: {e}")
    
    # 如果无法找到对应的GitHub用户名，返回None
    EMAIL_TO_USERNAME_MAP[email] = None
    return None

def get_github_avatar_url(username):
    """获取GitHub用户头像URL"""
    if not username:
        return None
        
    # 检查缓存
    if username in GITHUB_USERS_CACHE:
        return GITHUB_USERS_CACHE[username]['avatar_url']
    
    # 调用GitHub API获取用户信息
    try:
        request = urllib.request.Request(f"https://api.github.com/users/{username}")
        # 添加User-Agent避免API限制
        request.add_header('User-Agent', 'EasyDocument-Build-Script')
        
        with urllib.request.urlopen(request, timeout=5) as response:
            if response.getcode() == 200:
                data = json.loads(response.read().decode('utf-8'))
                # 缓存结果
                GITHUB_USERS_CACHE[username] = {
                    'avatar_url': data['avatar_url'],
                    'login': data['login'],
                    'html_url': data['html_url']
                }
                return data['avatar_url']
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, KeyError, TimeoutError) as e:
        print(f"获取GitHub用户 {username} 头像失败: {e}")
    
    return None

def get_git_info(repo, file_path, config):
    """获取文件的Git相关信息"""
    git_info = {
        "last_modified": None,
        "contributors": []
    }
    
    if not GIT_AVAILABLE or not config.get("git", {}).get("enable", True):
        return git_info
    
    try:
        # 确保是相对于仓库根目录的路径
        if file_path.startswith(repo.working_dir):
            file_rel_path = os.path.relpath(file_path, repo.working_dir)
        else:
            file_rel_path = file_path
            
        # 获取文件最后修改信息
        if config.get("git", {}).get("show_last_modified", True):
            commits = list(repo.iter_commits(paths=file_rel_path, max_count=1))
            if commits:
                last_commit = commits[0]
                
                # 获取GitHub用户名和头像
                github_username = get_github_username_by_email(last_commit.author.email, repo)
                github_avatar = None
                if github_username and config.get("github", {}).get("enable", True):
                    github_avatar = get_github_avatar_url(github_username)
                
                git_info["last_modified"] = {
                    "timestamp": last_commit.committed_date,  # Unix时间戳
                    "author": last_commit.author.name,
                    "email": last_commit.author.email,
                    "message": last_commit.message.strip(),
                    "github_username": github_username,
                    "github_avatar": github_avatar
                }
        
        # 获取文件贡献者信息
        if config.get("git", {}).get("show_contributors", True):
            # 获取所有提交该文件的作者
            authors = {}
            for commit in repo.iter_commits(paths=file_rel_path):
                author_name = commit.author.name
                author_email = commit.author.email
                
                if author_name not in authors:
                    # 获取GitHub用户名和头像
                    github_username = get_github_username_by_email(author_email, repo)
                    github_avatar = None
                    if github_username and config.get("github", {}).get("enable", True):
                        github_avatar = get_github_avatar_url(github_username)
                    
                    authors[author_name] = {
                        "name": author_name,
                        "email": author_email,
                        "commits": 0,
                        "github_username": github_username,
                        "github_avatar": github_avatar,
                        "last_commit_timestamp": commit.committed_date  # 添加最后提交时间戳
                    }
                authors[author_name]["commits"] += 1
                # 更新最后提交时间戳（如果当前提交更新）
                if commit.committed_date > authors[author_name]["last_commit_timestamp"]:
                    authors[author_name]["last_commit_timestamp"] = commit.committed_date
            
            # 按提交次数排序
            git_info["contributors"] = sorted(
                authors.values(), 
                key=lambda x: x["commits"], 
                reverse=True
            )
            
    except Exception as e:
        print(f"获取Git信息失败: {e}")
    
    return git_info

def scan_directory(directory, config, relative_path="", repo=None):
    """扫描目录并生成目录结构"""
    result = {
        "title": os.path.basename(directory) if relative_path else "首页",
        "path": relative_path,
        "children": [],
        "index": None,
    }
    
    # 获取目录中的所有文件和子目录
    items = []
    try:
        items = os.listdir(directory)
    except Exception as e:
        print(f"扫描目录失败: {directory}, 错误: {e}")
        return result
    
    # 文件和子目录分开处理
    files = []
    dirs = []
    
    for item in items:
        item_path = os.path.join(directory, item)
        if os.path.isfile(item_path) and is_supported_file(item, config):
            files.append(item)
        elif os.path.isdir(item_path) and not item.startswith('.'):
            dirs.append(item)
    
    # 首先处理索引文件
    for item in files:
        if is_index_file(item, config):
            item_path = os.path.join(relative_path, item)
            file_path = os.path.join(directory, item)
            index_data = {
                "title": get_file_title(file_path, item) or "文档首页",
                "path": item_path,
            }
            
            # 添加Git信息
            if repo:
                git_info = get_git_info(repo, file_path, config)
                if git_info["last_modified"] or git_info["contributors"]:
                    index_data["git"] = git_info
            
            result["index"] = index_data
            break
    
    # 处理其他文件
    for item in sorted(files):
        if not is_index_file(item, config):
            item_path = os.path.join(relative_path, item)
            file_path = os.path.join(directory, item)
            file_data = {
                "title": get_file_title(file_path, item),
                "path": item_path,
                "children": []
            }
            
            # 添加Git信息
            if repo:
                git_info = get_git_info(repo, file_path, config)
                if git_info["last_modified"] or git_info["contributors"]:
                    file_data["git"] = git_info
            
            result["children"].append(file_data)
    
    # 处理子目录
    for item in sorted(dirs):
        sub_dir_path = os.path.join(directory, item)
        sub_rel_path = os.path.join(relative_path, item)
        sub_result = scan_directory(sub_dir_path, config, sub_rel_path, repo)
        
        # 只添加非空的子目录
        if sub_result["children"] or sub_result["index"]:
            result["children"].append(sub_result)
    
    return result

def get_file_title(file_path, fallback_name):
    """尝试从文件内容中提取标题，如果失败则使用文件名作为标题"""
    try:
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == ".md":
            # 从Markdown文件中提取标题
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    # 寻找第一个标题行
                    if line.startswith('# '):
                        return line[2:].strip()
                    elif line.startswith('## '):
                        return line[3:].strip()
        
        elif ext == ".html":
            # 从HTML文件中提取标题
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # 简单查找<title>标签
                start_tag = '<title>'
                end_tag = '</title>'
                start_pos = content.find(start_tag)
                if start_pos > -1:
                    end_pos = content.find(end_tag, start_pos)
                    if end_pos > -1:
                        return content[start_pos + len(start_tag):end_pos].strip()
                
                # 或者寻找第一个<h1>标签
                start_tag = '<h1>'
                end_tag = '</h1>'
                start_pos = content.find(start_tag)
                if start_pos > -1:
                    end_pos = content.find(end_tag, start_pos)
                    if end_pos > -1:
                        return content[start_pos + len(start_tag):end_pos].strip()
    
    except Exception as e:
        print(f"读取文件 {file_path} 失败: {e}")
    
    # 如果没有找到标题，使用文件名（去除扩展名）
    filename = os.path.basename(fallback_name)
    return os.path.splitext(filename)[0]

def normalize_paths(structure):
    """
    规范化路径，使用斜杠而不是反斜杠（Windows上的路径）
    """
    if "path" in structure:
        structure["path"] = structure["path"].replace("\\", "/")
    
    if "index" in structure and structure["index"]:
        structure["index"]["path"] = structure["index"]["path"].replace("\\", "/")
    
    if "children" in structure:
        for child in structure["children"]:
            normalize_paths(child)
    
    return structure

def load_existing_structure(filepath):
    """加载已存在的path.json文件结构"""
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"加载已有结构文件失败: {e}")
    return None

def merge_structures(existing, new_structure, config):
    """合并已有结构和新扫描的结构，保留已有结构的排序，添加新内容"""
    if not existing:
        return new_structure
    
    # 更新基本信息和索引文件
    # 保留原标题，但更新索引文件（如果有变化）
    result = existing.copy()
    
    # 如果新结构有索引但旧结构没有，或索引路径发生变化
    if (new_structure.get("index") and (not existing.get("index") or 
                                       existing.get("index", {}).get("path") != new_structure.get("index", {}).get("path"))):
        # 如果旧结构有索引且标题不为空，保留原有标题
        if existing.get("index") and existing["index"].get("title"):
            new_index = new_structure["index"].copy()
            new_index["title"] = existing["index"]["title"]  # 保留原有标题
            result["index"] = new_index
        else:
            result["index"] = new_structure["index"]
    # 如果索引文件没有变化，但新结构中包含Git信息，则更新Git信息
    elif new_structure.get("index") and existing.get("index"):
        if "git" in new_structure["index"] and (
            "git" not in existing["index"] or 
            existing["index"]["git"] != new_structure["index"]["git"]
        ):
            # 复制索引但保留现有信息
            updated_index = existing["index"].copy()
            # 更新Git信息
            updated_index["git"] = new_structure["index"]["git"]
            result["index"] = updated_index
    
    # 创建现有路径的映射，用于快速查找
    existing_paths = {}
    if "children" in existing:
        for child in existing["children"]:
            path = child.get("path", "")
            if path:
                existing_paths[path] = child
    
    # 创建新路径的映射，用于检查
    new_paths = {}
    if "children" in new_structure:
        for child in new_structure["children"]:
            path = child.get("path", "")
            if path:
                new_paths[path] = child
    
    # 保留现有子项
    updated_children = []
    for child in existing.get("children", []):
        path = child.get("path", "")
        if path in new_paths:
            # 如果是目录，递归合并
            if child.get("children") or new_paths[path].get("children"):
                updated_child = merge_structures(child, new_paths[path], config)
                updated_children.append(updated_child)
            else:
                # 文件项，保留原有结构（例如可能包含order字段和手动设置的标题）但更新Git信息
                child_copy = child.copy()
                # 保留原有标题，不从文件内容重新提取覆盖
                # child_copy["title"] = new_paths[path]["title"]  # 注释掉此行以保留手动设置的标题
                
                # 更新Git信息
                if "git" in new_paths[path]:
                    child_copy["git"] = new_paths[path]["git"]
                
                updated_children.append(child_copy)
            # 标记为已处理
            del new_paths[path]
        else:
            # 检查这个路径是否真的不存在了
            full_path = os.path.join(config["root_dir"], path)
            if os.path.exists(full_path):
                # 如果文件或目录仍然存在，保留这个条目
                updated_children.append(child)
            else:
                print(f"移除不存在的项: {path}")
    
    # 添加新的子项（添加到末尾）
    for path, child in new_paths.items():
        updated_children.append(child)
    
    result["children"] = updated_children
    return result

def extract_content(file_path, max_chars=1000):
    """提取文件内容，用于搜索索引"""
    try:
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == ".md":
            # 从Markdown文件中提取内容
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # 移除Markdown标记
                # 移除代码块
                content = re.sub(r'```.*?```', '', content, flags=re.DOTALL)
                # 移除行内代码
                content = re.sub(r'`.*?`', '', content)
                # 移除链接，保留链接文本
                content = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', content)
                # 移除图片
                content = re.sub(r'!\[.*?\]\(.*?\)', '', content)
                # 移除HTML标签
                content = re.sub(r'<[^>]+>', '', content)
                # 移除标题标记
                content = re.sub(r'#+\s', '', content)
                # 移除空行和多余空格
                content = re.sub(r'\n+', ' ', content)
                content = re.sub(r'\s+', ' ', content)
                
                # 截取一部分内容
                return content[:max_chars]
        
        elif ext == ".html":
            # 从HTML文件中提取内容
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                parser = HTMLTextExtractor()
                parser.feed(content)
                text = parser.get_text()
                return text[:max_chars]
        
        return ""
    except Exception as e:
        print(f"读取文件 {file_path} 内容失败: {e}")
        return ""

def extract_keywords(content, max_keywords=10):
    """从内容中提取关键词"""
    if not content:
        return []
    
    # 定义停用词
    stopwords = set(['的', '了', '和', '是', '在', '我', '有', '个', '与', '这', '你', '们',
                     'the', 'and', 'is', 'in', 'to', 'of', 'a', 'for', 'on', 'that', 'by', 'this', 'with'])
    
    # 分词并统计频率
    words = re.findall(r'\b\w+\b|[\u4e00-\u9fa5]+', content.lower())
    word_freq = {}
    
    for word in words:
        if len(word) > 1 and word not in stopwords:
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # 按频率排序并返回前N个关键词
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, freq in sorted_words[:max_keywords]]

def build_search_tree(structure, config, result=None):
    """构建搜索树"""
    if result is None:
        result = []
    
    # 处理索引文档
    if structure.get("index"):
        file_path = os.path.join(config["root_dir"], structure["index"]["path"])
        if os.path.exists(file_path):
            content = extract_content(file_path)
            keywords = extract_keywords(content)
            
            search_item = {
                "title": structure["index"]["title"],
                "path": structure["index"]["path"],
                "content": content[:200] + "..." if len(content) > 200 else content,
                "keywords": keywords
            }
            result.append(search_item)
    
    # 处理文件
    for child in structure.get("children", []):
        if not child.get("children"):
            # 这是一个文件
            file_path = os.path.join(config["root_dir"], child["path"])
            if os.path.exists(file_path):
                content = extract_content(file_path)
                keywords = extract_keywords(content)
                
                search_item = {
                    "title": child["title"],
                    "path": child["path"],
                    "content": content[:200] + "..." if len(content) > 200 else content,
                    "keywords": keywords
                }
                result.append(search_item)
        else:
            # 这是一个目录，递归处理
            build_search_tree(child, config, result)
    
    return result

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="EasyDocument 文档路径生成工具")
    parser.add_argument('--root', default=DEFAULT_CONFIG["root_dir"], help='文档根目录')
    parser.add_argument('--output', default='path.json', help='输出的JSON文件路径')
    parser.add_argument('--search-index', default='search.json', help='搜索索引文件路径')
    parser.add_argument('--merge', action='store_true', help='合并已有的JSON文件，保留顺序和自定义字段')
    parser.add_argument('--config', default='config.js', help='配置文件路径')
    parser.add_argument('--no-git', action='store_true', help='禁用Git相关功能')
    parser.add_argument('--no-search', action='store_true', help='禁用搜索索引生成')
    parser.add_argument('--no-github', action='store_true', help='禁用GitHub API查询')
    parser.add_argument('-y', '--yes', action='store_true', help='自动确认所有提示，不询问')
    parser.add_argument('--package', action='store_true', help='创建更新包，打包指定文件为zip格式')
    parser.add_argument('--package-output', default='EasyDocument-update.zip', help='更新包输出路径')
    parser.add_argument('--initial-package', action='store_true', help='创建初始包，包含完整的项目文件')
    parser.add_argument('--initial-package-output', default='EasyDocument-initial.zip', help='初始包输出路径')
    parser.add_argument('--package-all', action='store_true', help='同时创建更新包和初始包')
    args = parser.parse_args()
    
    # 检查打包参数是否与其他操作参数共存
    if args.package or args.initial_package or args.package_all:
        package_args_count = 0
        if args.package:
            package_args_count += 1
        if args.initial_package:
            package_args_count += 1
        if args.package_all:
            package_args_count += 1
        
        if package_args_count > 1:
            print("错误: --package, --initial-package 和 --package-all 参数不能同时使用")
            sys.exit(1)
            
        # 检查是否使用了其他参数（除了包名称和--yes，它们可以与打包命令共存）
        other_args_used = False
        for arg_name, arg_value in vars(args).items():
            if arg_name not in ['package', 'package_output', 'initial_package', 'initial_package_output', 'package_all', 'yes'] and arg_value:
                if isinstance(arg_value, bool) and arg_value == True:
                    other_args_used = True
                    break
                elif not isinstance(arg_value, bool) and arg_value != parser.get_default(arg_name):
                    other_args_used = True
                    break
        
        if other_args_used:
            print("错误: 打包参数不能与其他操作参数共存")
            sys.exit(1)
            
        # 执行打包操作
        if args.package:
            create_update_package(args.package_output)
            return
        elif args.initial_package:
            create_initial_package(args.initial_package_output)
            return
        elif args.package_all:
            create_update_package(args.package_output)
            create_initial_package(args.initial_package_output)
            return
    
    # 检查是否有已存在的path.json文件且是否在没有使用任何参数的情况下运行
    if os.path.exists(args.output) and len(sys.argv) == 1:
        print("=" * 80)
        print("警告：检测到已存在的 path.json 文件！")
        print("=" * 80)
        print("如果不使用 --merge 参数重新生成，将可能会丢失以下信息：")
        print("  1. 文档的手动排序")
        print("  2. 自定义添加的属性或元数据")
        print("  3. 其他手动调整的结构")
        print("\n推荐使用以下命令:")
        print(f"  python {sys.argv[0]} --merge")
        print("\n完整的参数选项:")
        parser.print_help()
        print("\n" + "=" * 80)
        
        if not args.yes:
            response = input("\n是否仍要继续？这可能会重置您的文档结构。(y/n): ").strip().lower()
            if response != 'y' and response != 'yes':
                print("操作已取消。")
                sys.exit(0)
            else:
                print("\n继续执行，但不会合并现有结构...\n")
        else:
            print("\n自动确认模式：继续执行，但不会合并现有结构...\n")
    
    # 尝试从配置文件中提取配置
    config = DEFAULT_CONFIG.copy()
    if os.path.exists(args.config):
        try:
            with open(args.config, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # 移除注释以简化解析
                content_no_comments = re.sub(r'//.*', '', content)
                content_no_comments = re.sub(r'/\*.*?\*/', '', content_no_comments, flags=re.DOTALL)

                # 提取 site 对象内容
                site_match = re.search(r'site:\s*{([^}]+)}', content_no_comments, re.DOTALL)
                if site_match:
                    site_config = site_match.group(1)
                    # 提取 site 内的具体字段
                    title_match = re.search(r'title:\s*["\'](.*?)["\']', site_config)
                    if title_match: config["site"]["title"] = title_match.group(1)
                    
                    desc_match = re.search(r'description:\s*["\'](.*?)["\']', site_config)
                    if desc_match: config["site"]["description"] = desc_match.group(1)
                    
                    keywords_match = re.search(r'keywords:\s*["\'](.*?)["\']', site_config)
                    if keywords_match: config["site"]["keywords"] = keywords_match.group(1)
                    
                    base_url_match = re.search(r'base_url:\s*["\'](.*?)["\']', site_config)
                    if base_url_match: config["site"]["base_url"] = base_url_match.group(1)

                # 提取 appearance 对象内容
                appearance_match = re.search(r'appearance:\s*{([^}]+)}', content_no_comments, re.DOTALL)
                if appearance_match:
                    appearance_config = appearance_match.group(1)
                    # 提取 appearance 内的具体字段
                    favicon_match = re.search(r'favicon:\s*["\'](.*?)["\']', appearance_config)
                    if favicon_match: config["appearance"]["favicon"] = favicon_match.group(1)
                    
                    # 添加 logo 和 theme_color 的提取
                    logo_match = re.search(r'logo:\s*["\'](.*?)["\']', appearance_config)
                    if logo_match: config["appearance"]["logo"] = logo_match.group(1)
                    
                    theme_color_match = re.search(r'theme_color:\s*["\'](.*?)["\']', appearance_config)
                    if theme_color_match: config["appearance"]["theme_color"] = theme_color_match.group(1)

                # 提取 document 对象内容 (主要为了 root_dir)
                document_match = re.search(r'document:\s*{([^}]+)}', content_no_comments, re.DOTALL)
                if document_match:
                    doc_config = document_match.group(1)
                    root_dir_match = re.search(r'root_dir:\s*[\'"]([^\'"]+)[\'"]', doc_config)
                    if root_dir_match:
                        config["root_dir"] = root_dir_match.group(1)
                
                # 提取Git相关配置
                git_match = re.search(r'git:\s*{([^}]+)}', content_no_comments, re.DOTALL)
                if git_match:
                    git_config = git_match.group(1)
                    
                    enable_match = re.search(r'enable:\s*(true|false)', git_config, re.IGNORECASE)
                    if enable_match:
                        config["git"]["enable"] = enable_match.group(1).lower() == 'true'
                        
                    last_modified_match = re.search(r'show_last_modified:\s*(true|false)', git_config, re.IGNORECASE)
                    if last_modified_match:
                        config["git"]["show_last_modified"] = last_modified_match.group(1).lower() == 'true'
                        
                    contributors_match = re.search(r'show_contributors:\s*(true|false)', git_config, re.IGNORECASE)
                    if contributors_match:
                        config["git"]["show_contributors"] = contributors_match.group(1).lower() == 'true'
                
                # 提取GitHub相关配置
                github_match = re.search(r'github:\s*{([^}]+)}', content_no_comments, re.DOTALL)
                if github_match:
                    github_config = github_match.group(1)
                    
                    enable_match = re.search(r'enable:\s*(true|false)', github_config, re.IGNORECASE)
                    if enable_match:
                        config["github"]["enable"] = enable_match.group(1).lower() == 'true'
                        
                    edit_link_match = re.search(r'edit_link:\s*(true|false)', github_config, re.IGNORECASE)
                    if edit_link_match:
                        config["github"]["edit_link"] = edit_link_match.group(1).lower() == 'true'
                        
                    avatar_match = re.search(r'show_avatar:\s*(true|false)', github_config, re.IGNORECASE)
                    if avatar_match:
                        config["github"]["show_avatar"] = avatar_match.group(1).lower() == 'true'
                
        except Exception as e:
            print(f"读取配置文件失败: {e}")
    
    # 命令行参数覆盖配置文件
    if args.root:
        config["root_dir"] = args.root
    
    # 禁用Git功能（如果命令行指定）
    if args.no_git:
        config["git"]["enable"] = False
    
    # 禁用GitHub API查询（如果命令行指定）
    if args.no_github:
        config["github"]["enable"] = False
    
    root_dir = config["root_dir"]
    if not os.path.exists(root_dir):
        print(f"错误: 文档根目录 {root_dir} 不存在")
        sys.exit(1)
    
    print(f"开始扫描文档目录: {root_dir}")
    
    # 检查是否在Git仓库中
    repo = None
    if GIT_AVAILABLE and config["git"]["enable"]:
        try:
            repo = git.Repo(os.path.abspath(os.curdir), search_parent_directories=True)
            print(f"检测到Git仓库: {repo.working_dir}")
            
            # 如果启用了GitHub功能，预先加载Git邮箱到GitHub用户名的映射
            if config["github"]["enable"] and not args.no_github:
                print("预加载Git邮箱到GitHub用户名的映射...")
                # 获取所有提交者
                email_authors = {}
                try:
                    for commit in repo.iter_commits(max_count=200):
                        email = commit.author.email
                        if email not in email_authors and '@users.noreply.github.com' in email:
                            # 提取GitHub用户名
                            noreply_match = re.match(r'(\d+)\+(.+)@users\.noreply\.github\.com', email)
                            if noreply_match:
                                username = noreply_match.group(2)
                                if '+' in username:
                                    username = username.split('+')[-1]
                                EMAIL_TO_USERNAME_MAP[email] = username
                            
                            noreply_match2 = re.match(r'(.+)@users\.noreply\.github\.com', email)
                            if noreply_match2:
                                username = noreply_match2.group(1)
                                if '+' in username:
                                    username = username.split('+')[-1]
                                EMAIL_TO_USERNAME_MAP[email] = username
                except Exception as e:
                    print(f"预加载邮箱映射失败: {e}")
                
                # 加载用户信息
                for email, username in EMAIL_TO_USERNAME_MAP.items():
                    if username:
                        get_github_avatar_url(username)
                
                print(f"已预加载 {len(EMAIL_TO_USERNAME_MAP)} 个邮箱映射")
                
        except git.InvalidGitRepositoryError:
            print("未检测到Git仓库，Git相关功能将被禁用")
        except Exception as e:
            print(f"Git初始化错误: {e}")
    
    # 扫描目录结构
    structure = scan_directory(root_dir, config, repo=repo)
    
    # 规范化路径
    structure = normalize_paths(structure)
    
    # 如果需要合并已有结构
    if args.merge and os.path.exists(args.output):
        print(f"合并已有的JSON文件: {args.output}")
        existing = load_existing_structure(args.output)
        if existing:
            structure = merge_structures(existing, structure, config)
    
    # 保存路径结构
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(structure, f, ensure_ascii=False, indent=4)
    
    # 构建搜索索引
    if not args.no_search:
        print(f"构建搜索索引: {args.search_index}")
        search_tree = build_search_tree(structure, config)
        with open(args.search_index, 'w', encoding='utf-8') as f:
            json.dump(search_tree, f, ensure_ascii=False, indent=4)
    
    total_files = count_files(structure)
    total_dirs = count_dirs(structure)
    
    # 更新HTML元数据
    html_files_to_update = glob.glob('*.html')
    # 添加main目录下的HTML文件
    main_html_files = glob.glob('main/*.html')
    html_files_to_update.extend(main_html_files)
    update_html_metadata(html_files_to_update, config)
    
    print(f"文档扫描完成: 共 {total_files} 个文件, {total_dirs} 个目录")

def count_files(structure):
    """计算结构中的文件总数"""
    count = 0
    
    # 计算索引文件
    if "index" in structure and structure["index"]:
        count += 1
    
    # 计算子文件
    for child in structure["children"]:
        if "children" in child and len(child["children"]) == 0:
            # 这是一个文件
            count += 1
        else:
            # 这是一个目录，递归计算
            count += count_files(child)
    
    return count

def count_dirs(structure):
    """计算结构中的目录总数"""
    count = 0
    
    # 根目录算一个目录
    if structure["path"] == "":
        count = 1
    
    # 计算子目录
    for child in structure["children"]:
        if "children" in child and isinstance(child["children"], list):
            # 这是一个目录
            if child.get("path", ""):  # 排除根目录重复计算
                count += 1
            count += count_dirs(child)
    
    return count

def update_html_metadata(html_files, config):
    """
    根据 config.js 中的 site 和 appearance 设置更新 HTML 文件中的元数据。
    """
    site_config = config.get("site", {})
    appearance_config = config.get("appearance", {})

    title = site_config.get("title")
    description = site_config.get("description")
    keywords = site_config.get("keywords")
    favicon = appearance_config.get("favicon")

    for filepath in html_files:
        if not os.path.exists(filepath):
            print(f"警告: HTML文件未找到，跳过更新: {filepath}")
            continue

        try:
            with io.open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # 使用正则表达式进行替换
            if title:
                content = re.sub(r'(<title>)(.*?)(</title>)', r'\g<1>' + title + r'\g<3>', content, flags=re.IGNORECASE)
            if description:
                content = re.sub(r'(<meta\s+name=["\']description["\']\s+content=["\'])(.*?)(["\'])', r'\g<1>' + description + r'\g<3>', content, flags=re.IGNORECASE | re.DOTALL)
            if keywords:
                content = re.sub(r'(<meta\s+name=["\']keywords["\']\s+content=["\'])(.*?)(["\'])', r'\g<1>' + keywords + r'\g<3>', content, flags=re.IGNORECASE | re.DOTALL)
            if favicon:
                content = re.sub(r'(<link\s+rel=["\']icon["\']\s+href=["\'])(.*?)(["\'])', r'\g<1>' + favicon + r'\g<3>', content, flags=re.IGNORECASE | re.DOTALL)

            with io.open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"已更新元数据: {filepath}")

        except Exception as e:
            print(f"更新HTML文件 {filepath} 时出错: {e}")

def create_update_package(output_file='EasyDocument-update.zip'):
    """
    创建更新包，包含指定的文件和目录，用于覆盖更新旧项目的代码
    
    打包内容包括：
    - assets文件夹
    - main文件夹（包含index.html等）
    - config.js（在压缩包中改名为default.config.js）
    - 根目录下的html文件（如重定向文件）
    - meta.json
    - requirements.txt
    - build.py
    """
    print(f"开始创建更新包: {output_file}")
    
    # 创建临时目录存放待打包文件
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"创建临时目录: {temp_dir}")
        
        # 复制assets文件夹
        assets_path = 'assets'
        if os.path.exists(assets_path) and os.path.isdir(assets_path):
            assets_temp_path = os.path.join(temp_dir, 'assets')
            shutil.copytree(assets_path, assets_temp_path)
            print(f"已复制: {assets_path}")
        else:
            print(f"警告: {assets_path} 目录不存在，将被跳过")
        
        # 复制config.js并改名为default.config.js
        config_path = 'config.js'
        if os.path.exists(config_path):
            default_config_path = os.path.join(temp_dir, 'default.config.js')
            shutil.copy2(config_path, default_config_path)
            print(f"已复制并重命名: {config_path} -> default.config.js")
        else:
            print(f"警告: {config_path} 文件不存在，将被跳过")
        
        # 复制main目录
        main_path = 'main'
        if os.path.exists(main_path) and os.path.isdir(main_path):
            main_temp_path = os.path.join(temp_dir, 'main')
            shutil.copytree(main_path, main_temp_path)
            print(f"已复制: {main_path}")
        else:
            print(f"警告: {main_path} 目录不存在，将被跳过")
        
        # 复制根目录下的HTML文件（如重定向文件）
        root_html_files = ['main.html']
        for html_file in root_html_files:
            if os.path.exists(html_file):
                html_temp_path = os.path.join(temp_dir, html_file)
                shutil.copy2(html_file, html_temp_path)
                print(f"已复制: {html_file}")
            else:
                print(f"警告: {html_file} 文件不存在，将被跳过")
        
        # 复制其他文件
        other_files = ['meta.json', 'requirements.txt','build.py']
        for file in other_files:
            if os.path.exists(file):
                file_temp_path = os.path.join(temp_dir, file)
                shutil.copy2(file, file_temp_path)
                print(f"已复制: {file}")
            else:
                print(f"警告: {file} 文件不存在，将被跳过")
        
        # 创建ZIP文件
        with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 遍历临时目录中的所有文件和子目录
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    # 计算相对于临时目录的路径，作为zip内的路径
                    arc_path = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arc_path)
        
        print(f"更新包创建完成: {output_file}")
        # 显示ZIP文件大小
        zip_size = os.path.getsize(output_file)
        print(f"更新包大小: {zip_size / 1024:.2f} KB")

def create_initial_package(output_file='EasyDocument-initial.zip'):
    """
    创建初始包，包含完整的项目文件
    
    打包内容包括：
    - assets文件夹
    - main文件夹（包含index.html等）
    - data/README.md空文件
    - config.js (不改名)
    - 根目录下的html文件
    - LICENSE
    - README.md
    - build.py
    """
    print(f"开始创建初始包: {output_file}")
    
    # 创建临时目录存放待打包文件
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"创建临时目录: {temp_dir}")
        
        # 复制assets文件夹
        assets_path = 'assets'
        if os.path.exists(assets_path) and os.path.isdir(assets_path):
            assets_temp_path = os.path.join(temp_dir, 'assets')
            shutil.copytree(assets_path, assets_temp_path)
            print(f"已复制: {assets_path}")
        else:
            print(f"警告: {assets_path} 目录不存在，将被跳过")
        
        # 创建data目录和README.md空文件
        data_dir = os.path.join(temp_dir, 'data')
        os.makedirs(data_dir, exist_ok=True)
        data_readme = os.path.join(data_dir, 'README.md')
        with open(data_readme, 'w', encoding='utf-8') as f:
            f.write('# EasyDocument\n\n这是您的文档目录，请在此处添加Markdown或HTML文档。')
        print(f"已创建: data/README.md")
        
        # 复制config.js (不改名)
        config_path = 'config.js'
        if os.path.exists(config_path):
            config_temp_path = os.path.join(temp_dir, 'config.js')
            shutil.copy2(config_path, config_temp_path)
            print(f"已复制: {config_path}")
        else:
            print(f"警告: {config_path} 文件不存在，将被跳过")
        
        # 复制main目录
        main_path = 'main'
        if os.path.exists(main_path) and os.path.isdir(main_path):
            main_temp_path = os.path.join(temp_dir, 'main')
            shutil.copytree(main_path, main_temp_path)
            print(f"已复制: {main_path}")
        else:
            print(f"警告: {main_path} 目录不存在，将被跳过")
        
        # 复制根目录下的HTML文件
        html_files = glob.glob('*.html')
        for html_file in html_files:
            if os.path.exists(html_file):
                html_temp_path = os.path.join(temp_dir, html_file)
                shutil.copy2(html_file, html_temp_path)
                print(f"已复制: {html_file}")
            else:
                print(f"警告: {html_file} 文件不存在，将被跳过")
        
        # 复制其他文件
        other_files = ['LICENSE', 'README.md', 'build.py']
        for file in other_files:
            if os.path.exists(file):
                file_temp_path = os.path.join(temp_dir, file)
                shutil.copy2(file, file_temp_path)
                print(f"已复制: {file}")
            else:
                print(f"警告: {file} 文件不存在，将被跳过")
        
        # 创建ZIP文件
        with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 遍历临时目录中的所有文件和子目录
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    # 计算相对于临时目录的路径，作为zip内的路径
                    arc_path = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arc_path)
        
        print(f"初始包创建完成: {output_file}")
        # 显示ZIP文件大小
        zip_size = os.path.getsize(output_file)
        print(f"初始包大小: {zip_size / 1024:.2f} KB")

if __name__ == "__main__":
    main() 
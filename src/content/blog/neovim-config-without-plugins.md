---
pubDatetime: 2024-07-17
draft: false
title: How to get human rights in Neovim without plugins
description:
  You can get basic features like LSP, TreeSitter, completion and snippets in neovim
  without any plugins
---

## Introduction

Plugins have become a natural part of the Neovim community, which has grown explosively starting with v0.5.0 released in 2021.

- [lazy.nvim] (or [packer.nvim] or [rocks.nvim])
- [nvim-lspconfig]
- [nvim-treesitter]
- [nvim-cmp] (and dozens of cmp related plugins)
- [Luasnip] (and dozens of snippet related plugins)
- [mason.nvim]
- [Comment.nvim]
- [telescope.nvim] (or dozens of fuzzy finder plugins)

etc

It is pretty common to find more than 10 plugins installed in _most minimalistic neovim config_.

- Why do I need [nvim-lspconfig] or [nvim-treesitter] if Neovim officially supports LSP and TreeSitter?
- Why there are so many plugins needed to just get autocompletion?
- Why should I install weird third-party plugins? I just want to use NEOVIM!

If you have one of these questions, you've come to the right place.

In this article, we will look at how to achieve the same functionality in native neovim without famous plugins, and find out what exactly each plugin does and why it is needed.

## Replacing plugins

### LSP stuffs

#### nvim-lspconfig

Let's start with the most famous one.

> The Nvim LSP client does not live here. This is only a collection of LSP configures.
> -- [nvim-lspconfig] README

As indicated in the README, nvim-lspconfig, as its name suggests, is a plugin that provides default config values for Language Server.

Even without nvim-lspconfig, you can initiate connect Language Server to Neovim using the `vim.lsp.start()` API.

```lua
-- start the LSP and get the client id
-- it will re-use the running client if one is found matching name and root_dir
-- see `:h vim.lsp.start()` for more info
vim.lsp.start({
    name = "lua-language-server",
    cmd = { "lua-language-server" },
    root_dir = vim.fs.root(0, { ".luarc.json", ".luarc.jsonc", ".luacheckrc", ".stylua.toml", "stylua.toml", "selene.toml", "selene.yml", ".git" }),
})
```

And you can make an AutoCommand to run each Language Servers in specific filetypes.

```lua
---@type table<string, vim.lsp.ClientConfig>
local servers = {
    lua_ls = {
        name = "lua-language-server",
        cmd = { "lua-language-server" },
        root_dir = vim.fs.root(0, { ".luarc.json", ".luarc.jsonc", ".luacheckrc", ".stylua.toml", "stylua.toml", "selene.toml", "selene.yml", ".git" }),
        filetypes = { "lua" },
    },
    -- add more servers here
}
local group = vim.api.nvim_create_augroup("UserLspStart", { clear = true })
for name, config in pairs(servers) do
    vim.api.nvim_create_autocmd("FileType", {
        group = group,
        pattern = config.filetypes,
        callback = function (ev)
            vim.lsp.start(servers[name], { bufnr = ev.buf })
        end,
    })
end
```

With nvim-lspconfig, you only need to write this line and nvim-lspconfig will set all default configs for you.

```lua
require("lspconfig").lua_ls.setup()
```

#### mason.nvim

[mason.nvim] is a package manager inside Neovim which can install tools like Language Servers, Debug Servers, Formatters and Linters.

In other words, if you install the tool manually, mason.nvim is not necessary. For example, typescript-language-server can be installed as follows.

```sh
# npm
npm install -g typescript-language-server
```
(you can use whatever package manager you want instead of `npm` of course)

#### default LSP keymaps/options

Neovim sets various LSP related keymaps and options on `LspAttach` event by default. You can see full list with `:h lsp-defaults`.

Here is quick overview of default keymaps:
```
NORMAL MODE
K        : hover
grn      : rename
gra      : code action
grr      : references
CTRL-]   : definition
CTRL-W_] : definition in new window
CTRL-W_} : definition in preview window

VISUAL MODE
gq : format

INSERT MODE
CTRL-S        : signature help
CTRL-X_CTRL-O : completion
```

### Completion

#### nvim-cmp

Some surprising facts:

- Vim natively supports completion and completion UI. (`:h ins-completion`)
- There is user-configurable completion source for Vim. (`:h 'omnifunc'`)
- Neovim provides completion source from LSP. (`:h vim.lsp.omnifunc()`)
- Neovim provides completion source for TreeSitter Nodes or Queries. (`:h vim.treesitter.query.omnifunc()`)
- Neovim has `fuzzy` field in `'completeopt'` option since v0.11. (`:h 'completeopt'`)

##### cmp-nvim-lsp

So if you make `LspAttach` AutoCommand like below, you can use LSP-provided completion source with `i_CTRL-X_CTRL-O` keymap (press `<c-x><c-o>` in Insert Mode.)

```lua
vim.api.nvim_create_autocmd("LspAttach" {
    callback = function (ev)
        vim.bo[ev.buf].omnifunc = "v:lua.vim.lsp.omnifunc"
        -- ...
    end,
})
```

This AutoCommand is one of defaults in Neovim since v0.10.

However, we can't say that this alone properly utilizes the autocompletion provided by LSP. Since omnifunc does not provide functions such as snippet or auto-import, support for these must be set separately.
Fortunately, starting from v0.11, Neovim added this feature as a built-in API.

```lua
vim.api.nvim_create_autocmd("LspAttach" {
    callback = function (ev)
        vim.bo[ev.buf].omnifunc = "v:lua.vim.lsp.omnifunc"
        -- ...
    end,
})
```

When `vim.lsp.completion.enable()` is executed, Neovim performs the additional operations provided by the LSP in buffer where user auto-completes with LSP. (e.g. modifying part of the code like auto-import, or expanding a snippet)

##### cmp-path

Vim has a built-in filename completion. (`:h i_CTRL-X_CTRL-F`)

> [!NOTE]
> This is based on where `nvim` is executed, not current filepath.

##### cmp-buffer

Vim has a built-in buffer word completion.
- `:h i_CTRL-X_CTRL-P`
- `:h i_CTRL-X_CTRL-N`
- `:h i_CTRL-P`
- `:h i_CTRL-N`

##### Why use nvim-cmp then?

- Can gather multiple sources and display them at once
- Supports more diverse autocomplete sources
- Provides more diverse UI customization options
- Provides more sorting options

### Snippet

Lets have the snippet feature without plugins like [Luasnip] or [nvim-snippet].

Neovim has built-in snippet API in `vim.snippet` since v0.10, so most LSP-provided snippets work (since v0.11, if you enable the LSP completion.) But it still don't provide native API to make user-defined snippets that expands on specific keywords or trigger keymaps.

Instead, there is a similar function called `Abbreviation` (`:h Abbreviations`.) To briefly explain, if you register abbreviation in insert mode with `:iab ms Microsoft`, `ms<space>` or `ms<cr>` will be replaced with `Microsoft<space>` and `Microsoft<cr>`, respectively. This abbreviation can be triggered with the keymap `<c-]>` in addition to special characters such as `<space>`, `<cr>` or `()[]{}<>'",.`.

By using abbreviation and `vim.snippet`, we can implement the following snippet API.

```lua
---@param trigger string trigger string for snippet
---@param body string snippet text that will be expanded
---@param opts? vim.keymap.set.Opts
---
---Refer to <https://microsoft.github.io/language-server-protocol/specification/#snippet_syntax>
---for the specification of valid body.
function vim.snippet.add(trigger, body, opts)
    vim.keymap.set("ia", trigger, function()
        -- If abbrev is expanded with keys like "(", ")", "<cr>", "<space>",
        -- don't expand the snippet. Only accept "<c-]>" as trigger key.
        local c = vim.fn.nr2char(vim.fn.getchar(0))
        if c ~= "" then
            vim.api.nvim_feedkeys(trigger .. c, "i", true)
            return
        end
        vim.snippet.expand(body)
    end, opts)
end
```

With this, you can add custom snippets with `vim.snippet.add()` and use `<c-]>` keymap to expand the snippets.

Example of some lua function definition snippets:
```lua
vim.snippet.add(
    "fn",
    "function ${1:name}($2)\n\t${3:-- content}\nend",
    { buffer = 0 }
)
vim.snippet.add(
    "lfn",
    "local function ${1:name}($2)\n\t${3:-- content}\nend",
    { buffer = 0 }
)
```
put this in `after/ftplugin/lua.lua`

So when you type `fn<c-]>` in lua file, it will be expanded to this:
(`|...|` is a cursor)
```
function |name|()
    -- content
end
```

#### Why use nvim-snippets then?

[nvim-snippets] supports snippets in json format (compatible with VSCode,) and can be registered as an completion source for [nvim-cmp].

#### Why use Luasnip then?

[Luasnip] supports defining snippets in lua on top of that. So users can make more complex snippets.

### TreeSitter

#### nvim-treesitter

Long ago, it was near imposible to use TreeSitter parsers in Neovim without [nvim-treesitter] because most TreeSitter APIs lived in nvim-treesitter. But nowadays, those APIs are included in Neovim core, so you can use TreeSitter parsers without nvim-treesitter.

You can attach TreeSitter parser to current buffer with `vim.treesitter.start()`.

```lua
vim.api.nvim_create_autocmd("FileType", {
    callback = function(ev)
        pcall(vim.treesitter.start)
    end
})
```

We use `pcall` here because `vim.treesitter.start` may fail if no parser is registered for the filetype of the current buffer. 

##### Install TreeSitter parser manually

`:TSInstall` command in nvim-treesitter clones Parser's git repository and built the parser from it. Some TreeSitter parsers include query statements (highlight.scm, fold.scm, etc.) related to the parser in the repository, but some parts may not match Neovim's spec, so the nvim-treesitter plugin includes query statements for all parsers.

> [!INFO]
> This is based on the `master` branch of [nvim-treesitter]. New `main` branch will not include those query files.

Fortunately, as of this writing, most of the TreeSitter parsers are available on [luarocks.org], so you can easily install the TreeSitter parser package for Neovim using [luarocks]. These luarocks packages (aka. rocks) also include various queries (mostly taken from the nvim-treesitter repository) required to use each parser.

```sh
luarocks \
	--lua-version=5.1 \
	--tree=$HOME/.local/share/nvim/rocks \
	install --dev \
	tree-sitter-rust
```
> [!NOTE]
> replace `--tree` option to `$HOME/AppData/Local/nvim-data/rocks` if you are on Windows

With this script, you can install tree-sitter-rust parser and its query files in `$HOME/.local/share/nvim/rocks/lib/luarocks/rock-5.1/tree-sitter-rust/scm-1` path. You can add this path to `'runtimepath'` and Neovim will recognize the rust parser and needed query files.

```lua
vim.opt.runtimepath:append(vim.fs.joinpath(vim.fn.stdpath("data") --[[@as string]], "nvim", "rocks", "lib", "luarocks", "rocks-5.1", "tree-sitter-rust", "scm-1"))
```

You can use `:checkhealth vim.treesitter` to see if installed parser is registered without problem.

> [!CAUTION]
> Some TreeSitter parsers requires other packages to work properly.
> For example, `tree-sitter-javascript` and `tree-sitter-typescript` depend on `tree-sitter-ecma`.

### Fold

Neovim has built-in folding method using TreeSitter.
You can use TreeSitter provided fold with following options.

```lua
vim.o.foldenable = true
vim.o.foldlevel = 99
vim.o.foldlevelstart = 99
vim.o.foldmethod = "expr"
vim.o.foldexpr = "v:lua.vim.treesitter.foldexpr()"
```

### Comment

Neovim has default comment support since v0.10. (`:h commenting`)

## Conclusion

You can still have basic functionalities needed for code editing only with native Neovim APIs.

[nvim-snippets]: https://github.com/garymjr/nvim-snippets
[Luasnip]: https://github.com/L3MON4D3/LuaSnip
[luarocks.org]: https://luarocks.org
[nvim-treesitter]: https://github.com/nvim-treesitter/nvim-treesitter
[nvim-cmp]: https://github.com/hrsh7th/nvim-cmp
[mason.nvim]: https://github.com/williamboman/mason.nvim
[nvim-lspconfig]: https://github.com/neovim/nvim-lspconfig
[Comment.nvim]: https://github.com/numToStr/Comment.nvim
[telescope.nvim]: https://github.com/nvim-telescope/telescope.nvim
[packer.nvim]: https://github.com/wbthomason/packer.nvim
[rocks.nvim]: https://github.com/nvim-neorocks/rocks.nvim

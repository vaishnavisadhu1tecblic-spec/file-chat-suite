function Header() {
  return (
    <header className="flex items-center px-10 py-6 bg-[#faf8ff]">
      <h1 className="text-xl font-bold text-violet-700">
        <span class="flex items-center gap-2.5">
          <div class="mb-10 lg:hidden">
            <span class="flex items-center gap-2.5">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary">
                <svg
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 8.5A2.5 2.5 0 0 1 8.5 6H18M18 15.5a2.5 2.5 0 0 1-2.5 2.5H6"
                    stroke="currentColor"
                    class="text-primary-foreground"
                    stroke-width="2"
                    stroke-linecap="round"
                  ></path>
                  <circle
                    cx="17"
                    cy="8.5"
                    r="2.4"
                    class="fill-primary-foreground"
                  ></circle>
                  <circle
                    cx="7"
                    cy="15.5"
                    r="2.4"
                    class="fill-primary-foreground"
                  ></circle>
                </svg>
              </span>
              {/* <span class="text-[17px] font-semibold tracking-tight text-foreground">
                SyncSpace
              </span> */}
            </span>
          </div>
          <div id="designLogo" class="">
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 8.5A2.5 2.5 0 0 1 8.5 6H18M18 15.5a2.5 2.5 0 0 1-2.5 2.5H6"
                stroke="#fff"
                stroke-width="2"
                stroke-linecap="round"
              />
              <circle cx="17" cy="8.5" r="2.4" fill="#fff" />
              <circle cx="7" cy="15.5" r="2.4" fill="#fff" />
            </svg>
          </div>
          <span class="text-[17px] font-semibold tracking-tight text-black  text-foreground">
            SyncSpace
          </span>
        </span>
      </h1>
    </header>
  );
}

export default Header;

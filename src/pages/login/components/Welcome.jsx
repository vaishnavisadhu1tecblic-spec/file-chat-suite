import Files from ".././../../utils/Files";
function Welcome() {
  return (
    <div className="max-w-lg">
      <div className="flex items-center mb-10">
        <h2 className="ml-3 text-xl font-semibold"> </h2>
      </div>

      <img
        src={Files.WELCOME_IMG}
        alt="WELCOME"
        className="w-[410px] mx-auto mb-12"
      />

      <h2 class="mt-10 text-4xl font-normal tracking-tight text-foreground">
        One calm space for your team's work.
      </h2>

      <p className="py-6 text-gray-500 text-10px">
        Files, conversations and tasks together in one place. Stay organized and
        work faster with your team.
      </p>
    </div>
  );
}

export default Welcome;

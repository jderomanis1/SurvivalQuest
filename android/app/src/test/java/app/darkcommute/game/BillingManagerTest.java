package app.darkcommute.game;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class BillingManagerTest {
    @Test
    public void verificationIsFreshWithinSevenDays() {
        long now = 10_000_000_000L;
        long sixDaysAgo = now - (6L * 24L * 60L * 60L * 1000L);
        assertTrue(BillingManager.isVerificationFresh(now, sixDaysAgo));
    }

    @Test
    public void verificationExpiresAfterSevenDays() {
        long now = 10_000_000_000L;
        long eightDaysAgo = now - (8L * 24L * 60L * 60L * 1000L);
        assertFalse(BillingManager.isVerificationFresh(now, eightDaysAgo));
    }

    @Test
    public void futureVerificationTimestampIsRejected() {
        assertFalse(BillingManager.isVerificationFresh(1000L, 1001L));
    }
}
